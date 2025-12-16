# 📈 Portfolio Tracker

A modern, investment portfolio tracker built with React. Track your stocks and cryptocurrencies in one place with real-time price updates, visual analytics, and comprehensive transaction management. The app calculates your profit/loss using industry-standard FIFO (First In, First Out) cost basis methodology, giving you accurate insights into your investment performance.

## 🛠️ Tech Stack

- **Frontend**: React 19, React Router DOM
- **State Management**: TanStack Query (React Query) for server state
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Airtable
- **APIs**: TwelveData (stocks), CoinGecko (crypto)
- **Icons**: Phosphor Icons
- **Notifications**: React Hot Toast

## ✨ Features

### 🎯 Core Features

- Track stocks and cryptocurrencies with real-time price updates
- Add, edit, and delete buy/sell transactions
- FIFO cost basis calculation for accurate profit/loss tracking
- Portfolio performance chart showing value over time
- Asset allocation pie chart with percentage breakdown
- Individual asset detail pages with transaction history

### 🚀 Enhancements

- **Automatic price refresh** - Prices update every 60 seconds in the background
- **Optimistic UI updates** - Instant feedback when adding/editing transactions
- **Smart caching** - TanStack Query manages cache with 5-minute stale time and automatic garbage collection
- **Privacy mode** - Hide portfolio values with one click
- **Price caching fallback** - localStorage cache with fallback to expired cache on API failures
- **Sortable tables** - Click column headers to sort assets and transactions
- **Asset autocomplete** - Popular stocks and crypto suggestions with logos
- **Responsive design** - Works seamlessly on mobile and desktop
- **Form validation** - Prevents invalid transactions (e.g., selling more than you own, future dates)
- **Retry mechanism** - Automatic retry on failed requests with user-friendly error messages

## 🎯 Challenges Faced

- **API Rate Limiting**: Free-tier APIs have strict rate limits, causing failures when fetching prices for many assets. I solved this by implementing a multi-layer caching strategy with localStorage, staggering API requests by 200ms, and gracefully falling back to cached data (even expired) when APIs fail.

- **FIFO Cost Basis Calculation**: Implementing accurate cost basis for sells required careful tracking of purchase history. I had to sort transactions chronologically and iterate through buy orders to determine which shares were sold first, properly reducing the cost basis when shares are sold.

- **Airtable Field Stability**: Initially, I used field names to interact with Airtable, but renaming fields in the UI broke the app. I refactored to use field IDs instead of names, making the integration resilient to UI changes in the Airtable dashboard.

## 📚 What I Learned

- **TanStack Query for Server State**: Migrating from manual state management to TanStack Query taught me the power of declarative data fetching. The library handles caching, background refetching, optimistic updates, and error states automatically, reducing boilerplate code by ~40% while improving user experience with instant UI feedback and automatic price updates.

- **State Management Patterns**: Managing complex state across components (transactions, prices, loading states, modals) taught me the importance of lifting state appropriately and using `useMemo`/`useCallback` to prevent unnecessary re-renders and API calls. TanStack Query further simplified this by centralizing server state in custom hooks.

- **Error Resilience**: Building for the real world means anticipating failures. I learned to implement graceful degradation - the app continues working with cached data when APIs fail, shows meaningful error messages, and provides retry options instead of just breaking. TanStack Query's built-in retry mechanism and error handling made this even more robust.

- **Financial Domain Knowledge**: Building a portfolio tracker required understanding investment concepts like cost basis, unrealized gains, and FIFO accounting. This taught me the importance of domain research before implementing business logic.

## 🔮 Future Enhancements

- Historical price charts for individual assets
- Multiple portfolio support (e.g., retirement, trading accounts)
- CSV import/export for bulk transactions
- Dividend and income tracking
- Price alerts and notifications
- Dark/light theme toggle
- PWA support for offline access

## 📖 More Information

### 📁 Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx           # Main portfolio view
│   ├── AssetDetails.jsx        # Individual asset page
│   ├── PortfolioTable.jsx      # Sortable assets table
│   ├── PortfolioCharts.jsx     # Performance & allocation charts
│   ├── TransactionFormModal.jsx # Add/edit transaction form
│   └── Layout.jsx              # Page wrapper with footer
├── hooks/
│   └── usePortfolio.js         # Custom hooks for data fetching (TanStack Query)
├── services/
│   ├── airtable.js             # Database CRUD operations
│   ├── api.js                  # Price fetching with caching
│   └── utils.js                # Calculations & formatting
├── App.jsx                     # Router setup
├── main.jsx                    # Entry point with QueryClientProvider
└── ErrorBoundary.jsx           # Error handling wrapper
```

### 🧩 Key Components

**Dashboard.jsx**  
The central hub of the application. Uses TanStack Query hooks (`useTransactions`, `usePrices`) to fetch data with automatic caching and background refetching. Prices automatically refresh every 60 seconds. The component calculates portfolio metrics, manages UI state (tabs, modals, filters), and renders summary cards, charts, and the assets table. Optimistic updates provide instant feedback when adding/editing transactions.

**PortfolioTable.jsx**  
Displays all portfolio assets in a sortable table format. Each row shows the asset's current price, 24-hour change, market value, profit/loss, and average purchase price. Users can click column headers to sort data, use the action menu to delete assets or view transaction history, and click on any asset to navigate to its detail page.

**PortfolioCharts.jsx**  
Renders two visualizations using Recharts: a performance area chart showing portfolio value over time based on transaction history, and an allocation pie chart displaying the distribution of assets by value. The performance chart supports multiple time period filters (7d, 1m, 3m, YTD, 1y, All).

**TransactionFormModal.jsx**  
A modal form for adding and editing transactions. It includes an autocomplete feature for popular stocks and cryptocurrencies, validation logic to prevent invalid entries (like selling more than owned or future dates), and automatically determines asset type based on the selected ticker.

**AssetDetails.jsx**  
Shows detailed information for a single asset, accessed via `/asset/:ticker`. Displays the asset's current holdings, market value, average price, and complete transaction history. Users can edit individual transactions directly from this page.

### 🪝 Custom Hooks

**usePortfolio.js**  
Centralized data fetching layer using TanStack Query. Provides hooks for:
- `useTransactions()` - Fetches all transactions with 5-minute cache
- `usePrices(transactions)` - Fetches stock/crypto prices with 60-second auto-refresh
- `useAddTransaction()` - Mutation with optimistic updates
- `useUpdateTransaction()` - Mutation with optimistic updates
- `useDeleteAsset()` - Mutation for bulk deletion

All hooks handle loading states, errors, and caching automatically. Optimistic updates provide instant UI feedback before server confirmation.

### ⚙️ Services

**airtable.js**  
Handles all database operations with Airtable's REST API. Uses field IDs instead of field names for stability. Provides functions to fetch, create, update, and delete transactions. Normalizes data format between the API response and the application's internal structure.

**api.js**  
Manages price fetching from TwelveData (stocks) and CoinGecko (crypto). Implements a caching layer using localStorage with 5-minute expiration. Handles API rate limits gracefully by falling back to cached data (even expired) when requests fail. Staggers multiple requests by 200ms to avoid hitting rate limits.

**utils.js**  
Contains pure utility functions for formatting and calculations. The `calculatePortfolioData` function is the core calculation engine—it processes all transactions using FIFO methodology to determine current holdings, cost basis, and unrealized gains/losses for each asset.

### 🔄 Data Flow

1. **Initial Load**: 
   - Dashboard mounts → `useTransactions()` hook fetches from Airtable (cached for 5 min)
   - `usePrices()` hook automatically separates stocks/crypto and fetches prices
   - TanStack Query manages loading states and errors
   - Portfolio data calculated from transactions + prices

2. **Adding Transaction**: 
   - User submits form → Validation → `useAddTransaction().mutate()` called
   - **Optimistic update**: UI updates instantly with temporary transaction
   - Mutation saves to Airtable → On success: refetches transactions → On error: rollback

3. **Price Updates**: 
   - TanStack Query automatically refetches prices every 60 seconds
   - Checks localStorage cache first → If expired, fetches from API → Updates cache
   - Falls back to expired cache on API failure
   - Background refetching doesn't block UI

4. **Cache Management**:
   - TanStack Query handles all caching automatically
   - Shared cache between Dashboard and AssetDetails components
   - Automatic garbage collection after 10 minutes of inactivity
   - Refetch on window focus for fresh data

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Airtable account (free tier works)
- TwelveData API key (free tier available)
- CoinGecko API key (optional, free tier available)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Portfolio-Tracker-App
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables (see Environment Variables section below)

4. Start the development server
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Airtable Configuration
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_AIRTABLE_TABLE_ID=your_airtable_table_id  # Optional, defaults to existing table

# TwelveData API (for stock prices)
VITE_TWELVE_DATA_API_KEY=your_twelvedata_api_key

# CoinGecko API (optional, works without key but with rate limits)
VITE_COINGECKO_API_KEY=your_coingecko_api_key
```