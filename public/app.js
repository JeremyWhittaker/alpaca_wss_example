const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const newsContainer = document.getElementById('newsContainer');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const testNewsBtn = document.getElementById('testNewsBtn');
const apiKeyInput = document.getElementById('apiKey');
const apiSecretInput = document.getElementById('apiSecret');
const messageBox = document.getElementById('messageBox');
const debugLogs = document.getElementById('debugLogs');
const clearDebugBtn = document.getElementById('clearDebugBtn');
const newsCount = document.getElementById('newsCount');
const stocksGrid = document.getElementById('stocksGrid');
const stocksCount = document.getElementById('stocksCount');
const clearStocksBtn = document.getElementById('clearStocksBtn');
const autoConnectCheckbox = document.getElementById('autoConnect');

let ws = null;
let reconnectInterval = null;
let isFirstLoad = true;
let isConnectedToAlpaca = false;
let shouldReconnect = false;
let newsCounter = 0;
let stockData = new Map();
let stockElements = new Map();

function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `debug-log-entry ${type}`;
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    debugLogs.appendChild(logEntry);
    debugLogs.scrollTop = debugLogs.scrollHeight;
}

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');
        
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${tab}Tab`).classList.add('active');
    });
});

clearDebugBtn.addEventListener('click', () => {
    debugLogs.innerHTML = '';
    debugLog('Debug console cleared', 'info');
});

function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    
    if (type !== 'error') {
        setTimeout(() => {
            messageBox.className = 'message-box';
        }, 5000);
    }
}

function updateNewsCounter() {
    newsCount.textContent = `${newsCounter} news received`;
    newsCount.style.display = newsCounter > 0 ? 'inline-block' : 'none';
}

function updateStocksCounter() {
    const count = stockData.size;
    stocksCount.textContent = `${count} stock${count !== 1 ? 's' : ''} tracked`;
}

function createStockElement(symbol) {
    const card = document.createElement('div');
    card.className = 'stock-card';
    card.innerHTML = `
        <div class="stock-symbol">${symbol}</div>
        <div class="stock-price unchanged">--</div>
        <div class="stock-change">--</div>
        <div class="stock-details">
            <div class="stock-detail">
                <span class="stock-detail-label">Bid</span>
                <span class="stock-detail-value" data-bid>--</span>
            </div>
            <div class="stock-detail">
                <span class="stock-detail-label">Ask</span>
                <span class="stock-detail-value" data-ask>--</span>
            </div>
            <div class="stock-detail">
                <span class="stock-detail-label">Volume</span>
                <span class="stock-detail-value" data-volume>--</span>
            </div>
            <div class="stock-detail">
                <span class="stock-detail-label">Spread</span>
                <span class="stock-detail-value" data-spread>--</span>
            </div>
        </div>
        <div class="stock-timestamp">--</div>
    `;
    return card;
}

function updateStockDisplay(symbol, data) {
    let element = stockElements.get(symbol);
    
    if (!element) {
        // Remove placeholder if it exists
        const placeholder = stocksGrid.querySelector('.stocks-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        element = createStockElement(symbol);
        stockElements.set(symbol, element);
        stocksGrid.appendChild(element);
    }
    
    const priceEl = element.querySelector('.stock-price');
    const changeEl = element.querySelector('.stock-change');
    const bidEl = element.querySelector('[data-bid]');
    const askEl = element.querySelector('[data-ask]');
    const volumeEl = element.querySelector('[data-volume]');
    const spreadEl = element.querySelector('[data-spread]');
    const timestampEl = element.querySelector('.stock-timestamp');
    
    if (data.price !== undefined) {
        const prevPrice = stockData.get(symbol)?.price || data.price;
        priceEl.textContent = `$${data.price.toFixed(2)}`;
        
        if (data.price > prevPrice) {
            priceEl.className = 'stock-price up';
        } else if (data.price < prevPrice) {
            priceEl.className = 'stock-price down';
        } else {
            priceEl.className = 'stock-price unchanged';
        }
        
        const change = data.price - prevPrice;
        const changePercent = prevPrice ? ((change / prevPrice) * 100).toFixed(2) : 0;
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent}%)`;
        changeEl.style.color = change >= 0 ? '#4ade80' : '#ef4444';
    }
    
    if (data.bidPrice !== undefined) {
        bidEl.textContent = `$${data.bidPrice.toFixed(2)}`;
    }
    
    if (data.askPrice !== undefined) {
        askEl.textContent = `$${data.askPrice.toFixed(2)}`;
    }
    
    if (data.bidPrice !== undefined && data.askPrice !== undefined) {
        const spread = (data.askPrice - data.bidPrice).toFixed(2);
        spreadEl.textContent = `$${spread}`;
    }
    
    if (data.volume !== undefined) {
        const existingData = stockData.get(symbol) || {};
        const totalVolume = (existingData.volume || 0) + data.volume;
        volumeEl.textContent = totalVolume.toLocaleString();
        data.volume = totalVolume;
    }
    
    if (data.timestamp) {
        const time = new Date(data.timestamp).toLocaleTimeString();
        timestampEl.textContent = `Updated: ${time}`;
    }
    
    // Update stored data
    stockData.set(symbol, { ...stockData.get(symbol), ...data });
    updateStocksCounter();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return 'Just now';
    } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function createNewsElement(news, isNew = false) {
    const newsItem = document.createElement('div');
    newsItem.className = 'news-item';
    
    const symbolsHtml = news.symbols && news.symbols.length > 0 
        ? `<div class="news-symbols">
            ${news.symbols.map(symbol => `<span class="symbol-tag" data-symbol="${symbol}">${symbol}</span>`).join('')}
           </div>`
        : '';
    
    const newBadge = isNew ? '<span class="new-badge">New</span>' : '';
    
    newsItem.innerHTML = `
        ${newBadge}
        <div class="news-header">
            <h2 class="news-headline">${news.headline}</h2>
        </div>
        <div class="news-meta">
            <span class="news-author">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                </svg>
                ${news.author || 'Unknown'}
            </span>
            <span class="news-time">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
                ${formatTime(news.created_at)}
            </span>
        </div>
        ${symbolsHtml}
        <p class="news-summary">${news.summary}</p>
        ${news.url ? `
            <a href="${news.url}" target="_blank" class="news-link">
                Read full article
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                    <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                </svg>
            </a>
        ` : ''}
    `;
    
    // Add click handlers to symbol tags
    setTimeout(() => {
        newsItem.querySelectorAll('.symbol-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const symbol = tag.getAttribute('data-symbol');
                addSymbolToWatchlist(symbol);
            });
        });
    }, 0);
    
    return newsItem;
}

function addSymbolToWatchlist(symbol) {
    if (!symbol) return;
    
    debugLog(`Adding ${symbol} to watchlist`, 'info');
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'add_symbol',
            symbol: symbol
        }));
    }
    
    // Switch to stock data tab
    document.querySelector('[data-tab="stocks"]').click();
}

function updateStatus(connected) {
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected';
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Disconnected';
    }
}

function clearPlaceholder() {
    const placeholder = newsContainer.querySelector('.news-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    debugLog(`Attempting to connect to WebSocket at ${wsUrl}`, 'info');
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
        debugLog('WebSocket connected to server', 'success');
        updateStatus(true);
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            debugLog(`Received message: ${message.type}`, 'info');
            
            if (message.type === 'history') {
                clearPlaceholder();
                
                message.data.forEach((news, index) => {
                    const newsElement = createNewsElement(news, false);
                    newsContainer.appendChild(newsElement);
                });
                
                isFirstLoad = false;
            } else if (message.type === 'news') {
                clearPlaceholder();
                
                if (message.isTest) {
                    debugLog('Test news received', 'info');
                } else {
                    newsCounter++;
                    updateNewsCounter();
                    debugLog(`Real news received: ${message.data.headline}`, 'success');
                }
                
                const newsElement = createNewsElement(message.data, !isFirstLoad);
                newsContainer.insertBefore(newsElement, newsContainer.firstChild);
                
                const allItems = newsContainer.querySelectorAll('.news-item');
                if (allItems.length > 100) {
                    allItems[allItems.length - 1].remove();
                }
                
                setTimeout(() => {
                    const badge = newsElement.querySelector('.new-badge');
                    if (badge) {
                        badge.style.opacity = '0';
                        setTimeout(() => badge.remove(), 500);
                    }
                }, 5000);
            } else if (message.type === 'subscription_confirmed') {
                debugLog(`Subscription confirmed! Listening for news on: ${message.subscriptions.join(', ')}`, 'success');
                statusText.textContent = 'Subscribed - Waiting for news';
                testNewsBtn.disabled = false;
                showMessage('Successfully subscribed to news feed. Waiting for news...', 'success');
            } else if (message.type === 'auth_success') {
                debugLog('Authentication successful with Alpaca', 'success');
                isConnectedToAlpaca = true;
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                showMessage('Successfully connected to Alpaca news feed!', 'success');
            } else if (message.type === 'auth_error') {
                debugLog(`Authentication failed: ${message.error}`, 'error');
                isConnectedToAlpaca = false;
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
                showMessage(message.error || 'Failed to authenticate with Alpaca', 'error');
            } else if (message.type === 'error') {
                debugLog(`Error: ${message.error}`, 'error');
                showMessage(message.error || 'An error occurred', 'error');
            } else if (message.type === 'symbols_added') {
                debugLog(`Added symbols to stock tracking: ${message.symbols.join(', ')}`, 'info');
                message.symbols.forEach(symbol => {
                    if (!stockData.has(symbol)) {
                        stockData.set(symbol, {});
                        updateStockDisplay(symbol, {});
                    }
                });
            } else if (message.type === 'stock_trade') {
                const { symbol, price, size, timestamp } = message.data;
                debugLog(`Trade: ${symbol} @ $${price} x ${size}`, 'info');
                updateStockDisplay(symbol, { price, volume: size, timestamp });
            } else if (message.type === 'stock_quote') {
                const { symbol, bidPrice, askPrice, timestamp } = message.data;
                updateStockDisplay(symbol, { bidPrice, askPrice, timestamp });
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            debugLog(`Error parsing message: ${error.message}`, 'error');
        }
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        debugLog('WebSocket disconnected from server', 'warning');
        updateStatus(false);
        
        if (shouldReconnect && !reconnectInterval) {
            debugLog('Scheduling reconnect in 3 seconds...', 'info');
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                connectWebSocket();
            }, 3000);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        debugLog('WebSocket error occurred', 'error');
    };
}

connectBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const apiSecret = apiSecretInput.value.trim();
    
    debugLog('Connect button clicked', 'info');
    
    if (!apiKey || !apiSecret) {
        debugLog('Missing API credentials', 'error');
        showMessage('Please enter both API Key and API Secret', 'error');
        return;
    }
    
    debugLog(`API Key length: ${apiKey.length}, Secret length: ${apiSecret.length}`, 'info');
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        debugLog('WebSocket not connected, establishing connection first...', 'warning');
        showMessage('Connecting to server...', 'info');
        shouldReconnect = true;
        connectWebSocket();
        
        setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                debugLog('Sending auth message to server', 'info');
                ws.send(JSON.stringify({
                    type: 'auth',
                    apiKey: apiKey,
                    apiSecret: apiSecret
                }));
            } else {
                debugLog('WebSocket still not ready after timeout', 'error');
            }
        }, 1000);
    } else {
        debugLog('WebSocket ready, sending auth message directly', 'info');
        ws.send(JSON.stringify({
            type: 'auth',
            apiKey: apiKey,
            apiSecret: apiSecret
        }));
    }
});

disconnectBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'disconnect' }));
        isConnectedToAlpaca = false;
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        testNewsBtn.disabled = true;
        showMessage('Disconnected from Alpaca news feed', 'info');
    }
});

clearBtn.addEventListener('click', () => {
    newsContainer.innerHTML = '<div class="news-placeholder"><p>News feed cleared. Connect to see new updates.</p></div>';
    showMessage('News feed cleared', 'info');
});

testNewsBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        debugLog('Requesting test news...', 'info');
        ws.send(JSON.stringify({ type: 'test_news' }));
    }
});

saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const apiSecret = apiSecretInput.value.trim();
    const autoConnect = autoConnectCheckbox.checked;
    
    if (!apiKey || !apiSecret) {
        showMessage('Please enter both API Key and API Secret', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey, apiSecret, autoConnect })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('autoConnect', autoConnect);
            showMessage('Credentials saved successfully! They will be loaded automatically next time.', 'success');
        } else {
            showMessage(data.error || 'Failed to save credentials', 'error');
        }
    } catch (error) {
        console.error('Error saving credentials:', error);
        showMessage('Failed to save credentials', 'error');
    }
});

async function loadSavedCredentials() {
    try {
        const response = await fetch('/api/credentials');
        const data = await response.json();
        
        if (data.hasCredentials) {
            apiKeyInput.value = data.apiKey;
            apiSecretInput.value = data.apiSecret;
            
            const autoConnect = localStorage.getItem('autoConnect') === 'true';
            autoConnectCheckbox.checked = autoConnect;
            
            if (autoConnect) {
                showMessage('Auto-connecting with saved credentials...', 'info');
                setTimeout(() => {
                    connectBtn.click();
                }, 1000);
            } else {
                showMessage(`Saved credentials loaded (${data.apiKey.substring(0, 8)}...). Click "Connect to News Feed" to start.`, 'info');
            }
        }
    } catch (error) {
        console.error('Error loading saved credentials:', error);
    }
}

clearStocksBtn.addEventListener('click', () => {
    stockData.clear();
    stockElements.clear();
    stocksGrid.innerHTML = '<div class="stocks-placeholder"><p>Stock symbols from news will automatically appear here with real-time price updates</p></div>';
    updateStocksCounter();
    debugLog('Cleared all stock data', 'info');
});

loadSavedCredentials();
shouldReconnect = true;
connectWebSocket();