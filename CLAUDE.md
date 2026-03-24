# CLAUDE.md — Portfolio Tracker App

## Project Overview

A React SPA for tracking stock and cryptocurrency portfolios with FIFO cost-basis accounting, real-time prices, and analytics charts. Built with React 19, Vite, Supabase (auth + PostgreSQL), and TanStack Query.

## Tech Stack

- **Language**: JavaScript (JSX) — no TypeScript
- **Framework**: React 19 with functional components and hooks
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3 with CSS custom properties for dark/light theming
- **State**: TanStack Query v5 (server state), React Context (auth), local state (UI)
- **Database**: PostgreSQL via Supabase with Row Level Security
- **Auth**: Supabase Auth (email/password, JWT in localStorage)
- **Charts**: Recharts
- **Icons**: Phosphor Icons
- **Deployment**: Vercel (SPA rewrites via vercel.json)

## Directory Structure

```
src/
├── components/          # React components
│   ├── ui/              # Reusable UI primitives (FormInput, Button, etc.)
│   ├── Dashboard.jsx    # Main portfolio view
│   ├── AssetDetails.jsx # Single asset drill-down
│   ├── Login.jsx        # Auth page
│   ├── PortfolioTable.jsx
│   ├── PortfolioCharts.jsx
│   ├── TransactionFormModal.jsx
│   ├── Layout.jsx
│   ├── ProtectedRoute.jsx
│   └── ErrorBoundary.jsx
├── context/
│   └── AuthContext.jsx  # Auth state, user profile, isAdmin flag
├── hooks/               # Custom hooks
│   ├── usePortfolio.js  # TanStack Query hooks for transactions & prices
│   ├── useSort.js       # Table sorting
│   ├── useTheme.js      # Dark/light mode
│   ├── useTransactionModal.js
│   └── useClickOutside.js
├── services/            # Business logic & external APIs
│   ├── supabaseDb.js    # Transaction CRUD (Supabase client)
│   ├── api.js           # Price APIs (TwelveData for stocks, CoinGecko for crypto)
│   ├── cache.js         # localStorage caching utilities
│   └── utils.js         # Formatting, FIFO calculations
├── lib/
│   └── supabaseClient.js # Supabase singleton
├── constants/
│   └── assets.js        # Popular stocks/crypto lists, CRYPTO_MAP
├── App.jsx              # React Router setup
├── main.jsx             # Entry point (QueryClient, Toaster, theme)
└── index.css            # Tailwind imports + CSS variables
supabase/
└── migrations/
    └── 001_initial_schema.sql  # Tables, RLS policies, triggers
vite-plugins/
└── secureApiProxy.js    # Dev/preview middleware for API key injection
```

## Commands

```bash
npm run dev      # Start dev server (port 5173)
npm run build    # Production build to dist/
npm run lint     # ESLint with --max-warnings 0 (zero tolerance)
npm run preview  # Preview production build locally
```

## Linting

- ESLint 9 flat config with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- **Zero warnings policy** (`--max-warnings 0`) — any warning fails the lint
- File extensions checked: `.js`, `.jsx`

## No Test Suite

There is no automated testing framework configured. No Jest, Vitest, or test files exist.

## Environment Variables

**Required** (in `.env`):
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Optional** (for live market prices, server-side only):
```
TWELVE_DATA_API_KEY=...     # Stock quotes
COINGECKO_API_KEY=...       # Crypto prices
```

- `VITE_` prefix variables are embedded in the client bundle — safe for Supabase anon key but **never** for secret keys.
- Non-prefixed API keys are injected server-side by `vite-plugins/secureApiProxy.js` during dev/preview only.

## Database Schema

Two tables with RLS:

- **`profiles`** — `id` (UUID, FK auth.users), `email`, `role` ('user'|'admin'), `updated_at`
- **`transactions`** — `id` (UUID), `user_id` (FK auth.users), `ticker`, `name`, `type` ('Buy'|'Sell'), `quantity`, `price`, `total_cost`, `asset_class` ('Stock'|'Crypto'), `occurred_at`, `created_at`

RLS ensures users only see their own data; admins see all.

## Routing

```
/              → Dashboard (protected)
/login         → Login page
/asset/:ticker → Asset details (protected)
```

Protected routes redirect to `/login` when unauthenticated.

## Code Conventions

- **Functional components only** — no class components
- **PascalCase** for component files and names (`Dashboard.jsx`)
- **camelCase** for functions and hook files (`usePortfolio.js`)
- **UPPER_SNAKE_CASE** for constants (`POPULAR_STOCKS`, `GMT8_OFFSET_MS`)
- **ES6 modules** throughout (`import`/`export`)
- **Custom hooks** for reusable logic, kept in `src/hooks/`
- **Services layer** separates API/DB calls from components
- **TanStack Query** for all async data — mutations use optimistic updates
- **Tailwind CSS** utility classes — no CSS modules or styled-components
- **Dark mode by default**, light mode toggle via `useTheme` hook
- **Toast notifications** via `react-hot-toast` for user feedback

## Key Patterns

- **FIFO cost-basis**: `src/services/utils.js` implements First-In-First-Out accounting for portfolio P&L
- **API proxy**: External API keys never reach the client; `secureApiProxy.js` injects them server-side in dev/preview
- **Caching**: Two-minute cache for price data in localStorage, with 5-minute auto-refresh intervals via TanStack Query
- **Query keys**: Centralized in `usePortfolio.js` for consistent cache invalidation
- **Auth context**: `AuthContext.jsx` provides session, user, profile, and role throughout the app

## Security Notes

- Never add `SUPABASE_SERVICE_ROLE_KEY` to client-side code (bypasses RLS)
- API keys for TwelveData/CoinGecko must stay server-side (non-`VITE_` prefixed)
- RLS policies enforce data isolation per user at the database level
