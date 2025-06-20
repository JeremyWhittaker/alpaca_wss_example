# Alpaca WebSocket News & Stock Data Feed

A real-time web application that streams news and stock market data from Alpaca Markets using WebSocket connections. Features a modern dark-themed UI with automatic symbol tracking and real-time price updates.

![Alpaca News Feed](https://img.shields.io/badge/Alpaca-Markets-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18-green)

## Features

### 📰 Real-Time News Feed
- Streams live market news from Alpaca
- Auto-scrolling news feed with modern card design
- Clickable stock symbols that automatically add to watchlist
- News counter showing total articles received
- Test news generator for demo purposes

### 📈 Live Stock Data
- Real-time price updates with bid/ask spreads
- Automatic symbol tracking from news mentions
- Color-coded price movements (green/red)
- Volume tracking and spread calculations
- Click any news symbol to add to watchlist

### 💱 Cryptocurrency Tracking
- Real-time crypto price updates for top 10 cryptocurrencies
- Support for BTC, ETH, BNB, XRP, SOL, ADA, AVAX, DOGE, DOT, MATIC
- 24-hour high/low tracking and volume display
- One-click subscription to top 10 crypto by market cap
- Live bid/ask spreads and trade updates

### 🔑 Enhanced Credential Management
- Multiple API key storage with custom names
- Dropdown selection for saved API keys
- Automatic secret loading when selecting saved keys
- Auto-connect on startup with designated key
- Delete saved keys functionality
- Visual indicator for auto-connect enabled keys

### 🔧 Developer Features
- Debug console with detailed WebSocket logging
- Multi-tab interface (News, Stocks, Crypto, Debug)
- Secure credential storage in `credentials.json`
- Docker containerization for easy deployment
- Responsive design for all devices

## Prerequisites

- Docker and Docker Compose
- Alpaca Markets API credentials (free at [alpaca.markets](https://alpaca.markets))
- Node.js 18+ (for local development)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone git@github.com:JeremyWhittaker/alpaca_wss_example.git
   cd alpaca_wss_example
   ```

2. **Run with Docker**
   ```bash
   docker compose up -d --build
   ```

3. **Access the application**
   - Open http://localhost:9500 in your browser

4. **Enter your Alpaca credentials**
   - Get free API keys at https://alpaca.markets
   - Paper trading keys work for market data
   - Click "Save Credentials" to persist them
   - Or select from previously saved keys in the dropdown

## Configuration

### Environment Variables
Create a `.env` file (or use the UI to save credentials):
```env
ALPACA_API_KEY=your_api_key_here
ALPACA_API_SECRET=your_api_secret_here
PORT=9500
```

### Credential Management
- **Multiple Keys**: Save multiple API keys with custom names
- **Dropdown Selection**: Select from saved keys to auto-load credentials
- **Auto-Connect**: Check "Auto-connect on startup" for any saved key
- **Secure Storage**: Credentials stored in `credentials.json` (git-ignored)

## Usage

### Getting Started
1. Enter your Alpaca API credentials
2. Click "Connect to News Feed"
3. News will start streaming automatically
4. Click any stock symbol in news to track it

### Navigation
- **News Feed Tab**: View real-time market news
- **Stock Data Tab**: Monitor live price updates
- **Crypto Tab**: Track top 10 cryptocurrencies
- **Debug Console Tab**: View WebSocket messages and troubleshoot

### Test Mode
- Click "Test News" to generate sample news with AAPL and SPY
- Useful for testing outside market hours

## Architecture

### Backend (Node.js/Express)
- WebSocket server for client connections
- Alpaca WebSocket clients for news and stock data
- Real-time message broadcasting to all connected clients
- Automatic reconnection handling

### Frontend (Vanilla JavaScript)
- WebSocket client with auto-reconnect
- Dynamic UI updates without page refresh
- Local storage for user preferences
- Responsive CSS with modern glassmorphism design

### Data Feeds
- **News Feed**: `wss://stream.data.alpaca.markets/v1beta1/news`
- **Stock Data**: `wss://stream.data.alpaca.markets/v2/iex` (IEX feed)
- **Crypto Data**: `wss://stream.data.alpaca.markets/v1beta3/crypto/us`

## Development

### Local Development (without Docker)
```bash
npm install
npm start
```

### Project Structure
```
alpaca-news-feed/
├── server.js          # Express server with WebSocket handling
├── public/
│   ├── index.html     # Main HTML file
│   ├── app.js         # Frontend JavaScript
│   └── styles.css     # CSS styles
├── package.json       # Node dependencies
├── Dockerfile         # Docker configuration
└── docker-compose.yml # Docker Compose setup
```

### WebSocket Message Types

#### Client → Server
- `auth`: Authenticate with Alpaca credentials
- `disconnect`: Close Alpaca connections
- `test_news`: Generate test news items
- `add_symbol`: Add symbol to stock watchlist
- `subscribe_top10_crypto`: Subscribe to top 10 cryptocurrencies

#### Server → Client
- `news`: New news article
- `stock_trade`: Stock trade update
- `stock_quote`: Bid/ask quote update
- `crypto_trade`: Crypto trade update
- `crypto_quote`: Crypto bid/ask update
- `crypto_bar`: Crypto OHLCV data
- `auth_success`: Authentication successful
- `subscription_confirmed`: Successfully subscribed to data

## Troubleshooting

### No Stock Updates
- Stock data only updates during market hours (9:30 AM - 4:00 PM ET)
- Check Debug Console for subscription confirmations
- Ensure you're using valid Alpaca API credentials

### Connection Issues
- Verify your API credentials are correct
- Check the Debug Console tab for error messages
- Ensure Docker container is running: `docker ps`

### View Logs
```bash
docker logs alpaca-news-feed-alpaca-news-feed-1 -f
```

## API Rate Limits
- Alpaca provides generous rate limits for market data
- WebSocket connections are persistent (no request limits)
- Free tier includes real-time data access

## Security Notes
- API credentials are stored locally in `credentials.json` and `.env`
- Never commit `.env` or `credentials.json` to version control
- Both files are included in `.gitignore`
- Use environment variables in production
- Credentials are only transmitted over secure WebSocket (WSS)

## Contributing
Feel free to submit issues and enhancement requests!

## License
MIT License - see LICENSE file for details

## Acknowledgments
- [Alpaca Markets](https://alpaca.markets) for providing the market data APIs
- Built with Node.js, Express, and WebSockets

---
🚀 Built with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>