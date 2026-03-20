# 📈 Portfolio Tracker

A modern investment portfolio tracker built with React. Track stocks and cryptocurrencies in one place with real-time price updates, visual analytics, and comprehensive transaction management. The app calculates profit/loss using industry-standard FIFO (First In, First Out) cost basis methodology.

![image of portfolio tracker](images/portfolio-tracker_image.png)

## ✨ Features

- **Price Tracking** - Stock and crypto prices with 24h change indicators (auto-refreshes every 5 minutes)
- **FIFO Cost Basis** - Accurate profit/loss calculation using First-In-First-Out methodology
- **Transaction Management** - Add, edit, and delete buy/sell transactions with validation
- **Portfolio Analytics** - Performance charts and allocation pie charts with time filters
- **Privacy Mode** - One-click toggle to hide sensitive portfolio values

## 🛠️ Tech Stack

| Category             | Technologies                            |
| -------------------- | --------------------------------------- |
| **Frontend**         | React 19, React Router DOM              |
| **State Management** | TanStack Query (React Query)            |
| **Styling**          | Tailwind CSS                            |
| **Charts**           | Recharts                                |
| **Build Tool**       | Vite                                    |
| **Database**         | Airtable                                |
| **APIs**             | TwelveData (stocks), CoinGecko (crypto) |
| **Icons**            | Phosphor Icons                          |

## 🎯 What I Learned

- **TanStack Query** - Declarative data fetching with built-in caching, background refetching, and optimistic updates significantly reduced boilerplate while improving UX
- **Component Abstraction** - Extracting reusable UI components (`FormInput`, `ButtonGroup`, `IconButton`) and custom hooks (`useSort`, `useClickOutside`) reduced code duplication by ~60%
- **Resilient API Design** - Multi-layer caching (fresh → stale → expired), batch API requests to minimize rate limit usage, and graceful degradation ensure the app works even when APIs fail
- **Financial Domain Logic** - Implementing FIFO cost basis required understanding investment accounting—processing transactions chronologically while maintaining buy queues per asset
- **Single Source of Truth** - Consolidating shared data (like crypto mappings) into centralized constants prevents drift and simplifies maintenance

## 🔮 Future Enhancements

- Historical price charts for individual assets
- Multiple portfolio support (retirement, trading accounts)
- CSV import/export for bulk transactions
- Dividend and income tracking
- Price alerts and notifications
- Dark/light theme toggle
- PWA support for offline access

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
│       ├── ButtonGroup.jsx     # Button group with variants (pills, tabs, toggle)
│       ├── AssetDropdown.jsx   # Asset autocomplete dropdown
│       ├── StatCard.jsx        # Metric display card
│       ├── AssetLogo.jsx       # Logo with fallback
│       ├── Button.jsx          # Button component with primary variant
│       ├── IconButton.jsx      # Icon button with variants (edit, delete, add, more, close)
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
│   └── assets.js               # Centralized asset data & crypto mappings
└── App.jsx                     # Router setup
```

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

**Do not use `VITE_` prefixes for API keys.** In Vite, any `VITE_*` variable is compiled into the browser bundle, so anyone can read it. This app keeps secrets on the server and exposes only same-origin `/api/*` routes (via the Vite dev server and `vite preview`).

Create a `.env` file in the root directory (see `.env.example`):

```env
# Airtable (required for transactions)
AIRTABLE_API_KEY=your_airtable_personal_access_token
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_TABLE_ID=your_airtable_table_id  # Optional; default exists in code

# TwelveData (stock prices)
TWELVE_DATA_API_KEY=your_twelvedata_api_key

# CoinGecko (optional; improves rate limits)
COINGECKO_API_KEY=your_coingecko_demo_api_key
```

During migration, the dev/preview proxy also reads legacy `VITE_*` names for the same variables so old `.env` files keep working—but you should rename them to the names above so secrets are never intended for client exposure.

### Production builds

`npm run build` outputs static files only. They do not contain your keys, but the browser still calls `/api/...`, so you must serve the app behind a host that implements the same proxy routes (Node server, serverless functions, etc.). `npm run preview` runs Vite’s preview server with the proxy for local testing of production assets.

## 🗄️ Airtable Schema

Create a table in Airtable with the following columns:

| Column Name | Field Type     | Description                        |
| ----------- | -------------- | ---------------------------------- |
| Ticker      | Single line    | Asset symbol (e.g., AAPL, BTC)     |
| Name        | Single line    | Asset name (e.g., Apple Inc.)      |
| Asset Class | Single select  | `Stock` or `Crypto`                |
| Order Type  | Single select  | Transaction type: `Buy` or `Sell`  |
| Price       | Number         | Price per unit at transaction time |
| Quantity    | Number         | Number of shares/coins             |
| Total Cost  | Formula/Number | Quantity × Price                   |
| Date        | Date           | Transaction date and time          |
