# 📈 Portfolio Tracker

A modern investment portfolio tracker built with React. Track your stocks and cryptocurrencies in one place with real-time price updates, visual analytics, and comprehensive transaction management. The app calculates your profit/loss using industry-standard FIFO (First In, First Out) cost basis methodology.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154?logo=react-query)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)

## ✨ Core Features

- **Real-time Price Tracking** - Live stock and crypto prices with 24h change indicators
- **FIFO Cost Basis** - Accurate profit/loss calculation using First-In-First-Out methodology
- **Transaction Management** - Add, edit, and delete buy/sell transactions with validation
- **Portfolio Analytics** - Performance charts and allocation pie charts with time filters
- **Privacy Mode** - One-click toggle to hide sensitive portfolio values
- **Smart Caching** - Multi-layer caching with localStorage fallback for API resilience
- **Responsive Design** - Optimized for both desktop and mobile devices

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, React Router DOM |
| **State Management** | TanStack Query (React Query) |
| **Styling** | Tailwind CSS |
| **Charts** | Recharts |
| **Build Tool** | Vite |
| **Database** | Airtable |
| **APIs** | TwelveData (stocks), CoinGecko (crypto) |
| **Icons** | Phosphor Icons |

## 📁 Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx           # Main portfolio view with charts & tables
│   ├── AssetDetails.jsx        # Individual asset page with history
│   ├── PortfolioTable.jsx      # Sortable assets table with actions
│   ├── PortfolioCharts.jsx     # Performance & allocation charts
│   ├── TransactionFormModal.jsx # Add/edit transaction form
│   ├── Layout.jsx              # Page wrapper with footer
│   └── ui/                     # Reusable UI components
│       ├── FormInput.jsx       # Form input with validation
│       ├── ToggleButtonGroup.jsx # Toggle button group
│       ├── AssetDropdown.jsx   # Asset autocomplete dropdown
│       ├── StatCard.jsx        # Metric display card
│       ├── FilterButtons.jsx   # Asset type filter
│       ├── TabSwitcher.jsx     # Tab navigation
│       ├── AssetLogo.jsx       # Logo with fallback
│       ├── EditButton.jsx      # Edit action button
│       ├── TransactionTypeBadge.jsx # Buy/Sell badge
│       ├── LoadingState.jsx    # Loading indicator
│       └── EmptyState.jsx      # Empty table state
├── hooks/
│   ├── usePortfolio.js         # TanStack Query hooks for data
│   ├── useTransactionModal.js  # Modal state management
│   ├── useSort.js              # Reusable table sorting
│   └── useClickOutside.js      # Click outside detection
├── services/
│   ├── airtable.js             # Database CRUD operations
│   ├── api.js                  # Price fetching with caching
│   ├── cache.js                # Centralized cache utilities
│   └── utils.js                # Formatting & calculations
├── constants/
│   └── assets.js               # Popular assets for autocomplete
└── App.jsx                     # Router setup
```

## 🎯 What I Learned

### Server State Management with TanStack Query
Migrating from manual state management to TanStack Query transformed how I handle async data. The library's declarative approach to data fetching—with built-in caching, background refetching, and optimistic updates—reduced boilerplate significantly while improving UX with instant feedback and automatic price refreshes.

### Component Abstraction & DRY Principles
I learned to identify patterns across components and extract them into reusable abstractions:
- **UI Components**: `FormInput`, `ToggleButtonGroup`, `AssetDropdown` reduced form code by ~60%
- **Custom Hooks**: `useTransactionModal`, `useSort`, `useClickOutside` eliminated duplicate logic
- **Service Utilities**: Centralized caching in `cache.js` consolidated localStorage patterns
- **Constants**: Extracted `SEARCH_ASSETS` to a dedicated file with helper functions

The key insight: wait until patterns emerge naturally before abstracting.

### Resilient API Integration
Building for production means anticipating failures. I implemented graceful degradation with multi-layer caching (fresh → stale → expired), request staggering to avoid rate limits, and meaningful error states. TanStack Query's retry mechanism and cache management made this robust architecture achievable.

### Financial Domain Logic
Implementing FIFO cost basis calculation required deep understanding of investment accounting. Processing transactions chronologically while maintaining buy queues for each asset taught me the importance of domain research before coding business logic.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Airtable account (free tier works)
- TwelveData API key (free tier available)
- CoinGecko API key (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Portfolio-Tracker-App

# Install dependencies
npm install

# Set up environment variables (see below)

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Airtable Configuration
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_AIRTABLE_TABLE_ID=your_airtable_table_id  # Optional

# TwelveData API (for stock prices)
VITE_TWELVE_DATA_API_KEY=your_twelvedata_api_key

# CoinGecko API (optional, works without key but with rate limits)
VITE_COINGECKO_API_KEY=your_coingecko_api_key
```

## 🔮 Future Enhancements

- [ ] Historical price charts for individual assets
- [ ] Multiple portfolio support (retirement, trading accounts)
- [ ] CSV import/export for bulk transactions
- [ ] Dividend and income tracking
- [ ] Price alerts and notifications
- [ ] Dark/light theme toggle
- [ ] PWA support for offline access
