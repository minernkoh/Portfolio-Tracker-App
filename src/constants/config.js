// Centralized configuration constants

// Cache durations (ms)
export const CACHE_DURATION_MS = {
  TRANSACTIONS: 5 * 60 * 1000, // 5 minutes
  PRICES: 2 * 60 * 1000, // 2 minutes
  HISTORICAL_PRICES: 24 * 60 * 60 * 1000, // 24 hours
};

// Refetch intervals (ms)
export const REFETCH_INTERVAL_MS = {
  PRICES: 5 * 60 * 1000, // 5 minutes
};

// Rate limiting
export const RATE_LIMIT_MS = 60 * 1000; // 1 minute between historical price API requests

// Timezone
export const GMT8_OFFSET_MS = 8 * 60 * 60 * 1000; // 8 hours
