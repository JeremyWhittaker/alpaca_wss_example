# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-01-20

### Added
- Enhanced credential management system
  - Multiple API key storage with custom names
  - Dropdown selection for saved API keys
  - Automatic secret loading when selecting saved keys
  - Delete saved keys functionality
  - Visual indicators for auto-connect enabled keys
- Stored credentials in `credentials.json` file
- Added key name input field for better organization

### Changed
- Updated UI to show saved keys dropdown
- Modified auto-connect to work with specific saved keys
- Enhanced documentation with credential management details

### Security
- Added `credentials.json` to `.gitignore`
- Configured git local excludes for sensitive files

## [1.1.0] - 2024-01-20

### Added
- Cryptocurrency tracking feature
  - New Crypto tab in the interface
  - Real-time crypto data via Alpaca WebSocket API v1beta3
  - Support for top 10 cryptocurrencies by market cap
  - One-click "Subscribe to Top 10 Crypto" button
  - 24-hour high/low tracking
  - Volume display with million formatting
  - Bid/Ask spread visualization
- Crypto display cards with modern design
- Auto-updating crypto counters

### Changed
- Updated navigation to include Crypto tab
- Enhanced WebSocket message handling for crypto data

## [1.0.0] - 2024-01-19

### Initial Release
- Real-time news feed from Alpaca Markets
- Live stock price tracking with auto-symbol detection
- Modern dark-themed UI with glassmorphism effects
- Multi-tab interface (News, Stocks, Debug Console)
- WebSocket connections with auto-reconnect
- Docker containerization
- Debug console for troubleshooting
- Test news generator
- Clickable symbols in news feed
- Auto-connect on startup
- Credential persistence in `.env` file