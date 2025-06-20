# Alpaca WebSocket News & Stock Data Feed

A real-time web application that streams news, stock, and cryptocurrency market data from Alpaca Markets using WebSocket connections. Features a modern dark-themed UI with automatic symbol tracking, multi-key credential management, and real-time price updates across multiple asset classes.

![Alpaca News Feed](https://img.shields.io/badge/Alpaca-Markets-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18-green)

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Docker Commands](#docker-commands)
- [API Reference](#websocket-message-types)
- [Security Notes](#security-notes)
- [Contributing](#contributing)

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
1. **First Time Setup**:
   - Enter your Alpaca API credentials
   - Optionally provide a name for your key (e.g., "Paper Trading")
   - Click "Save Credentials" to store for future use
   - Check "Auto-connect on startup" to connect automatically next time

2. **Returning Users**:
   - Select your saved key from the dropdown
   - Credentials will auto-populate
   - Click "Connect to News Feed"

3. **Real-time Data**:
   - News will start streaming automatically once connected
   - Click any stock symbol in news to track it in the Stock Data tab
   - Navigate to Crypto tab and click "Subscribe to Top 10 Crypto" for cryptocurrency data

### Navigation
- **News Feed Tab**: View real-time market news
- **Stock Data Tab**: Monitor live price updates
- **Crypto Tab**: Track top 10 cryptocurrencies
- **Debug Console Tab**: View WebSocket messages and troubleshoot

### Features in Detail

#### News Feed
- Real-time news articles from all major financial sources
- Clickable symbols that auto-add to your stock watchlist
- Visual indicators for new articles
- Automatic scrolling with newest items at top

#### Stock Tracking
- Automatic symbol detection from news articles
- Real-time price updates during market hours
- Bid/Ask spread visualization
- Volume tracking
- Color-coded price movements

#### Cryptocurrency
- One-click subscription to top 10 cryptocurrencies
- 24/7 real-time updates (crypto markets never close)
- High/Low tracking for 24-hour periods
- Volume in millions for easy reading

#### Test Mode
- Click "Test News" to generate sample news with AAPL and SPY
- Useful for testing outside market hours
- Helps verify WebSocket connections are working

## Architecture

### Backend (Node.js/Express)
- WebSocket server for client connections
- Three separate Alpaca WebSocket connections:
  - News feed connection for market news
  - Stock data connection for equity prices
  - Crypto connection for cryptocurrency data
- Real-time message broadcasting to all connected clients
- Automatic reconnection handling
- Credential management with multi-key support
- RESTful API endpoints for credential CRUD operations

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
│   ├── index.html     # Main HTML file with multi-tab interface
│   ├── app.js         # Frontend JavaScript with WebSocket client
│   └── styles.css     # CSS styles with glassmorphism design
├── credentials.json   # Saved API keys (git-ignored)
├── .env              # Environment variables (git-ignored)
├── package.json       # Node dependencies
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose setup
├── .gitignore        # Git ignore rules
├── LICENSE           # MIT License
└── README.md         # This file
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
- Crypto data updates 24/7
- Check Debug Console for subscription confirmations
- Ensure you're using valid Alpaca API credentials
- Paper trading keys work perfectly for market data

### Saved Keys Not Appearing
- Check that `credentials.json` exists in the project root
- Ensure the Docker container has proper file permissions
- Try saving a new key through the UI

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

## Docker Commands

### Build and Start
```bash
docker compose up -d --build
```

### View Logs
```bash
docker compose logs -f
```

### Stop Container
```bash
docker compose down
```

### Restart Container
```bash
docker compose restart
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 9500 |
| `ALPACA_API_KEY` | Your Alpaca API key | - |
| `ALPACA_API_SECRET` | Your Alpaca API secret | - |

## Contributing
Feel free to submit issues and enhancement requests!

## License
MIT License - see LICENSE file for details

## Supported Cryptocurrencies

The following top 10 cryptocurrencies by market cap are supported:
- **BTC** - Bitcoin
- **ETH** - Ethereum  
- **BNB** - Binance Coin
- **XRP** - Ripple
- **SOL** - Solana
- **ADA** - Cardano
- **AVAX** - Avalanche
- **DOGE** - Dogecoin
- **DOT** - Polkadot
- **MATIC** - Polygon

## Browser Compatibility

- Chrome/Edge (Recommended)
- Firefox
- Safari
- Mobile browsers supported with responsive design

## Performance Notes

- WebSocket connections are persistent for minimal latency
- News feed buffers last 100 articles
- Efficient DOM updates only for visible elements
- Automatic cleanup of old data to prevent memory leaks

## Acknowledgments
- [Alpaca Markets](https://alpaca.markets) for providing the market data APIs
- Built with Node.js, Express, and WebSockets
- UI inspired by modern fintech applications

---
🚀 Built with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>