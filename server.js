const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Store multiple saved credentials
const credentialsPath = path.join(__dirname, 'credentials.json');

function loadCredentials() {
    try {
        if (fs.existsSync(credentialsPath)) {
            return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading credentials:', error);
    }
    return { keys: [], autoConnect: null };
}

function saveCredentials(credentials) {
    try {
        fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving credentials:', error);
        return false;
    }
}

app.post('/api/credentials', (req, res) => {
    const { apiKey, apiSecret, autoConnect, name } = req.body;
    
    if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: 'API Key and Secret are required' });
    }
    
    const credentials = loadCredentials();
    
    // Check if this key already exists
    const existingIndex = credentials.keys.findIndex(k => k.apiKey === apiKey);
    
    const keyName = name || `Key ${apiKey.substring(0, 8)}...`;
    const keyEntry = {
        name: keyName,
        apiKey: apiKey,
        apiSecret: apiSecret,
        addedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
        // Update existing key
        credentials.keys[existingIndex] = keyEntry;
    } else {
        // Add new key
        credentials.keys.push(keyEntry);
    }
    
    // Update auto-connect preference
    if (autoConnect) {
        credentials.autoConnect = apiKey;
    } else if (credentials.autoConnect === apiKey) {
        credentials.autoConnect = null;
    }
    
    if (saveCredentials(credentials)) {
        // Also update .env for backward compatibility
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        try {
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }
            
            const envLines = envContent.split('\n').filter(line => line.trim() !== '');
            const envVars = {};
            
            envLines.forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key.trim()] = valueParts.join('=').trim();
                }
            });
            
            envVars['ALPACA_API_KEY'] = apiKey;
            envVars['ALPACA_API_SECRET'] = apiSecret;
            if (!envVars['PORT']) {
                envVars['PORT'] = '9500';
            }
            
            const newEnvContent = Object.entries(envVars)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
            
            fs.writeFileSync(envPath, newEnvContent);
            
            process.env.ALPACA_API_KEY = apiKey;
            process.env.ALPACA_API_SECRET = apiSecret;
        } catch (error) {
            console.error('Error updating .env:', error);
        }
        
        res.json({ success: true, message: 'Credentials saved successfully' });
    } else {
        res.status(500).json({ error: 'Failed to save credentials' });
    }
});

app.get('/api/credentials', (req, res) => {
    const credentials = loadCredentials();
    
    // Also check .env for backward compatibility
    const envKey = process.env.ALPACA_API_KEY;
    const envSecret = process.env.ALPACA_API_SECRET;
    
    if (envKey && envSecret && envKey !== 'your_api_key_here') {
        // Check if env key is already in saved credentials
        const hasEnvKey = credentials.keys.some(k => k.apiKey === envKey);
        if (!hasEnvKey) {
            credentials.keys.push({
                name: `Env Key ${envKey.substring(0, 8)}...`,
                apiKey: envKey,
                apiSecret: envSecret,
                addedAt: new Date().toISOString()
            });
        }
    }
    
    res.json({
        keys: credentials.keys.map(k => ({
            name: k.name,
            apiKey: k.apiKey,
            apiKeyDisplay: `${k.apiKey.substring(0, 8)}...`,
            addedAt: k.addedAt
        })),
        autoConnect: credentials.autoConnect
    });
});

app.get('/api/credentials/:apiKey', (req, res) => {
    const { apiKey } = req.params;
    const credentials = loadCredentials();
    
    const keyEntry = credentials.keys.find(k => k.apiKey === apiKey);
    if (keyEntry) {
        res.json({
            apiKey: keyEntry.apiKey,
            apiSecret: keyEntry.apiSecret
        });
    } else {
        res.status(404).json({ error: 'Key not found' });
    }
});

app.delete('/api/credentials/:apiKey', (req, res) => {
    const { apiKey } = req.params;
    const credentials = loadCredentials();
    
    credentials.keys = credentials.keys.filter(k => k.apiKey !== apiKey);
    if (credentials.autoConnect === apiKey) {
        credentials.autoConnect = null;
    }
    
    if (saveCredentials(credentials)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to delete credential' });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

const ALPACA_NEWS_WS_URL = 'wss://stream.data.alpaca.markets/v1beta1/news';
const ALPACA_STOCK_WS_URL = 'wss://stream.data.alpaca.markets/v2/iex';
const ALPACA_CRYPTO_WS_URL = 'wss://stream.data.alpaca.markets/v1beta3/crypto/us';

let alpacaNewsWs = null;
let alpacaStockWs = null;
let alpacaCryptoWs = null;
let newsBuffer = [];
const MAX_BUFFER_SIZE = 100;
let currentApiKey = null;
let currentApiSecret = null;
let isAlpacaNewsConnected = false;
let isAlpacaStockConnected = false;
let isAlpacaCryptoConnected = false;
let subscribedSymbols = new Set();
let subscribedCryptos = new Set();

function connectToAlpaca(apiKey, apiSecret) {
    if (alpacaNewsWs) {
        alpacaNewsWs.close();
    }
    if (alpacaStockWs) {
        alpacaStockWs.close();
    }
    if (alpacaCryptoWs) {
        alpacaCryptoWs.close();
    }
    
    currentApiKey = apiKey;
    currentApiSecret = apiSecret;
    isAlpacaNewsConnected = false;
    isAlpacaStockConnected = false;
    isAlpacaCryptoConnected = false;
    
    connectToAlpacaNews(apiKey, apiSecret);
    connectToAlpacaStocks(apiKey, apiSecret);
    connectToAlpacaCrypto(apiKey, apiSecret);
}

function connectToAlpacaNews(apiKey, apiSecret) {
    alpacaNewsWs = new WebSocket(ALPACA_NEWS_WS_URL);

    alpacaNewsWs.on('open', () => {
        console.log('Connected to Alpaca news feed');
        
        const authMessage = JSON.stringify({
            action: 'auth',
            key: apiKey,
            secret: apiSecret
        });
        alpacaNewsWs.send(authMessage);
    });

    alpacaNewsWs.on('message', (data) => {
        try {
            const messages = JSON.parse(data);
            
            for (const message of messages) {
                if (message.T === 'success' && message.msg === 'authenticated') {
                    console.log('Authenticated with Alpaca News');
                    isAlpacaNewsConnected = true;
                    alpacaNewsWs.send(JSON.stringify({
                        action: 'subscribe',
                        news: ['*']
                    }));
                    broadcast({
                        type: 'auth_success'
                    });
                } else if (message.T === 'subscription' && message.news) {
                    console.log('Successfully subscribed to news feed:', message.news);
                    broadcast({
                        type: 'subscription_confirmed',
                        subscriptions: message.news
                    });
                } else if (message.T === 'error') {
                    console.error('Alpaca news auth error:', message);
                    isAlpacaNewsConnected = false;
                    broadcast({
                        type: 'auth_error',
                        error: message.msg || 'Authentication failed'
                    });
                } else if (message.T === 'n') {
                    const newsItem = {
                        id: message.id,
                        headline: message.headline,
                        summary: message.summary,
                        author: message.author,
                        created_at: message.created_at,
                        updated_at: message.updated_at,
                        url: message.url,
                        symbols: message.symbols || []
                    };
                    
                    newsBuffer.unshift(newsItem);
                    if (newsBuffer.length > MAX_BUFFER_SIZE) {
                        newsBuffer = newsBuffer.slice(0, MAX_BUFFER_SIZE);
                    }
                    
                    broadcast({
                        type: 'news',
                        data: newsItem
                    });
                    
                    // Add symbols to stock tracking
                    if (newsItem.symbols && newsItem.symbols.length > 0) {
                        subscribeToStockSymbols(newsItem.symbols);
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing Alpaca message:', error);
        }
    });

    alpacaNewsWs.on('error', (error) => {
        console.error('Alpaca News WebSocket error:', error);
        isAlpacaNewsConnected = false;
        broadcast({
            type: 'auth_error',
            error: 'Connection to Alpaca News failed'
        });
    });

    alpacaNewsWs.on('close', () => {
        console.log('Alpaca News connection closed');
        isAlpacaNewsConnected = false;
        alpacaNewsWs = null;
    });
}

function connectToAlpacaStocks(apiKey, apiSecret) {
    alpacaStockWs = new WebSocket(ALPACA_STOCK_WS_URL);

    alpacaStockWs.on('open', () => {
        console.log('Connected to Alpaca stock data feed');
        
        const authMessage = JSON.stringify({
            action: 'auth',
            key: apiKey,
            secret: apiSecret
        });
        alpacaStockWs.send(authMessage);
    });

    alpacaStockWs.on('message', (data) => {
        try {
            const messages = JSON.parse(data);
            
            for (const message of messages) {
                if (message.T === 'success' && message.msg === 'authenticated') {
                    console.log('Authenticated with Alpaca Stock Data');
                    isAlpacaStockConnected = true;
                } else if (message.T === 'subscription') {
                    console.log('Stock subscription confirmed:', message);
                } else if (message.T === 't') {
                    // Trade update
                    console.log(`Trade update for ${message.S}: $${message.p}`);
                    broadcast({
                        type: 'stock_trade',
                        data: {
                            symbol: message.S,
                            price: message.p,
                            size: message.s,
                            timestamp: message.t
                        }
                    });
                } else if (message.T === 'q') {
                    // Quote update
                    console.log(`Quote update for ${message.S}: Bid $${message.bp} Ask $${message.ap}`);
                    broadcast({
                        type: 'stock_quote',
                        data: {
                            symbol: message.S,
                            bidPrice: message.bp,
                            bidSize: message.bs,
                            askPrice: message.ap,
                            askSize: message.as,
                            timestamp: message.t
                        }
                    });
                } else if (message.T === 'error') {
                    console.error('Stock data error:', message);
                }
            }
        } catch (error) {
            console.error('Error parsing Alpaca stock message:', error);
        }
    });

    alpacaStockWs.on('error', (error) => {
        console.error('Alpaca Stock WebSocket error:', error);
        isAlpacaStockConnected = false;
    });

    alpacaStockWs.on('close', () => {
        console.log('Alpaca Stock connection closed');
        isAlpacaStockConnected = false;
        alpacaStockWs = null;
    });
}

function subscribeToStockSymbols(symbols) {
    if (!alpacaStockWs || !isAlpacaStockConnected) {
        console.log('Stock WebSocket not connected, cannot subscribe to symbols');
        return;
    }
    
    const newSymbols = symbols.filter(s => !subscribedSymbols.has(s));
    if (newSymbols.length === 0) return;
    
    newSymbols.forEach(s => subscribedSymbols.add(s));
    
    console.log('Subscribing to stock data for:', newSymbols);
    alpacaStockWs.send(JSON.stringify({
        action: 'subscribe',
        trades: newSymbols,
        quotes: newSymbols
    }));
    
    broadcast({
        type: 'symbols_added',
        symbols: newSymbols
    });
}

function connectToAlpacaCrypto(apiKey, apiSecret) {
    alpacaCryptoWs = new WebSocket(ALPACA_CRYPTO_WS_URL);

    alpacaCryptoWs.on('open', () => {
        console.log('Connected to Alpaca crypto data feed');
        
        const authMessage = JSON.stringify({
            action: 'auth',
            key: apiKey,
            secret: apiSecret
        });
        alpacaCryptoWs.send(authMessage);
    });

    alpacaCryptoWs.on('message', (data) => {
        try {
            const messages = JSON.parse(data);
            
            for (const message of messages) {
                if (message.T === 'success' && message.msg === 'authenticated') {
                    console.log('Authenticated with Alpaca Crypto Data');
                    isAlpacaCryptoConnected = true;
                } else if (message.T === 'subscription') {
                    console.log('Crypto subscription confirmed:', message);
                } else if (message.T === 't') {
                    // Crypto trade update
                    console.log(`Crypto trade update for ${message.S}: $${message.p}`);
                    broadcast({
                        type: 'crypto_trade',
                        data: {
                            symbol: message.S,
                            price: message.p,
                            size: message.s,
                            timestamp: message.t
                        }
                    });
                } else if (message.T === 'q') {
                    // Crypto quote update
                    console.log(`Crypto quote update for ${message.S}: Bid $${message.bp} Ask $${message.ap}`);
                    broadcast({
                        type: 'crypto_quote',
                        data: {
                            symbol: message.S,
                            bidPrice: message.bp,
                            bidSize: message.bs,
                            askPrice: message.ap,
                            askSize: message.as,
                            timestamp: message.t
                        }
                    });
                } else if (message.T === 'b') {
                    // Crypto bar (OHLCV) update
                    broadcast({
                        type: 'crypto_bar',
                        data: {
                            symbol: message.S,
                            open: message.o,
                            high: message.h,
                            low: message.l,
                            close: message.c,
                            volume: message.v,
                            timestamp: message.t
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing Alpaca crypto message:', error);
        }
    });

    alpacaCryptoWs.on('error', (error) => {
        console.error('Alpaca Crypto WebSocket error:', error);
        isAlpacaCryptoConnected = false;
    });

    alpacaCryptoWs.on('close', () => {
        console.log('Alpaca Crypto connection closed');
        isAlpacaCryptoConnected = false;
        alpacaCryptoWs = null;
    });
}

function subscribeToCryptos(symbols) {
    if (!alpacaCryptoWs || !isAlpacaCryptoConnected) {
        console.log('Crypto WebSocket not connected, cannot subscribe to symbols');
        return;
    }
    
    const newCryptos = symbols.filter(s => !subscribedCryptos.has(s));
    if (newCryptos.length === 0) return;
    
    newCryptos.forEach(s => subscribedCryptos.add(s));
    
    console.log('Subscribing to crypto data for:', newCryptos);
    alpacaCryptoWs.send(JSON.stringify({
        action: 'subscribe',
        trades: newCryptos,
        quotes: newCryptos,
        bars: newCryptos
    }));
    
    broadcast({
        type: 'cryptos_added',
        symbols: newCryptos
    });
}

function disconnectFromAlpaca() {
    if (alpacaNewsWs) {
        alpacaNewsWs.close();
        alpacaNewsWs = null;
        isAlpacaNewsConnected = false;
    }
    if (alpacaStockWs) {
        alpacaStockWs.close();
        alpacaStockWs = null;
        isAlpacaStockConnected = false;
    }
    if (alpacaCryptoWs) {
        alpacaCryptoWs.close();
        alpacaCryptoWs = null;
        isAlpacaCryptoConnected = false;
    }
    currentApiKey = null;
    currentApiSecret = null;
    subscribedSymbols.clear();
    subscribedCryptos.clear();
}

function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.send(JSON.stringify({
        type: 'history',
        data: newsBuffer
    }));
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('Received client message:', message.type);
            
            if (message.type === 'auth') {
                const { apiKey, apiSecret } = message;
                console.log('Processing auth request...');
                
                if (!apiKey || !apiSecret) {
                    console.error('Missing API credentials');
                    ws.send(JSON.stringify({
                        type: 'auth_error',
                        error: 'API Key and Secret are required'
                    }));
                    return;
                }
                
                console.log('Connecting to Alpaca with provided credentials...');
                connectToAlpaca(apiKey, apiSecret);
            } else if (message.type === 'disconnect') {
                console.log('Processing disconnect request...');
                disconnectFromAlpaca();
            } else if (message.type === 'test_news') {
                console.log('Generating test news...');
                
                const testNewsItems = [
                    {
                        id: `test-${Date.now()}-1`,
                        headline: 'Apple Reports Strong Q4 Earnings Beat - Test News',
                        summary: 'Apple (AAPL) reported earnings that exceeded analyst expectations with strong iPhone sales. This is a test news item.',
                        author: 'Test System',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        url: 'https://alpaca.markets/',
                        symbols: ['AAPL']
                    },
                    {
                        id: `test-${Date.now()}-2`,
                        headline: 'S&P 500 ETF Reaches New All-Time High - Test News',
                        summary: 'The SPDR S&P 500 ETF (SPY) reached a new all-time high amid positive market sentiment. This is a test news item.',
                        author: 'Test System',
                        created_at: new Date(Date.now() - 60000).toISOString(),
                        updated_at: new Date(Date.now() - 60000).toISOString(),
                        url: 'https://alpaca.markets/',
                        symbols: ['SPY']
                    }
                ];
                
                // Send test news items with delay
                testNewsItems.forEach((testNews, index) => {
                    setTimeout(() => {
                        ws.send(JSON.stringify({
                            type: 'news',
                            data: testNews,
                            isTest: true
                        }));
                        
                        // Trigger stock subscription
                        if (testNews.symbols && testNews.symbols.length > 0) {
                            subscribeToStockSymbols(testNews.symbols);
                        }
                    }, index * 1000);
                });
            } else if (message.type === 'add_symbol') {
                const { symbol } = message;
                if (symbol) {
                    console.log(`Adding ${symbol} to watchlist`);
                    subscribeToStockSymbols([symbol]);
                }
            } else if (message.type === 'subscribe_top10_crypto') {
                console.log('Subscribing to top 10 cryptocurrencies');
                const top10Cryptos = [
                    'BTC/USD',   // Bitcoin
                    'ETH/USD',   // Ethereum
                    'BNB/USD',   // Binance Coin
                    'XRP/USD',   // Ripple
                    'SOL/USD',   // Solana
                    'ADA/USD',   // Cardano
                    'AVAX/USD',  // Avalanche
                    'DOGE/USD',  // Dogecoin
                    'DOT/USD',   // Polkadot
                    'MATIC/USD'  // Polygon
                ];
                subscribeToCryptos(top10Cryptos);
            }
        } catch (error) {
            console.error('Error handling client message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Invalid message format'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Auto-connect if configured
const credentials = loadCredentials();
if (credentials.autoConnect) {
    const keyEntry = credentials.keys.find(k => k.apiKey === credentials.autoConnect);
    if (keyEntry) {
        console.log(`Auto-connecting with saved key: ${keyEntry.name}`);
        connectToAlpaca(keyEntry.apiKey, keyEntry.apiSecret);
    }
}