// service for fetching and managing historical prices with rate limiting
// batches API calls to respect rate limits (1 per minute) and stores in Airtable

import {
  fetchHistoricalStockPrice,
  fetchHistoricalCryptoPrice,
  fetchHistoricalCommodityPrice,
} from './api';
import {
  fetchHistoricalPrices as fetchFromBackend,
  storeHistoricalPrices as storeToBackend,
} from './api-client';
import { normalizeAssetType, formatDateToISO } from './utils';
import { RATE_LIMIT_MS } from '../constants/config';

// Rate limiter: ensures we don't exceed 1 request per minute
class RateLimiter {
  constructor(minIntervalMs = RATE_LIMIT_MS) {
    this.minIntervalMs = minIntervalMs;
    this.lastRequestTime = 0;
    this.queue = [];
    this.processing = false;
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minIntervalMs) {
        // Wait until enough time has passed
        await new Promise((resolve) =>
          setTimeout(resolve, this.minIntervalMs - timeSinceLastRequest)
        );
      }

      const { fn, resolve, reject } = this.queue.shift();
      this.lastRequestTime = Date.now();

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(RATE_LIMIT_MS);

// Get unique ticker-date pairs that need historical prices
const getPriceRequests = (transactions) => {
  const requests = [];
  const seen = new Set();

  transactions.forEach((tx) => {
    if (!tx.date || !tx.ticker) return;
    
    const dateStr = formatDateToISO(tx.date);
    const key = `${tx.ticker}|${dateStr}|${normalizeAssetType(tx.assetType)}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      requests.push({
        ticker: tx.ticker,
        date: dateStr,
        assetType: tx.assetType,
      });
    }
  });

  return requests;
};

// Fetch historical prices with rate limiting and caching in Airtable
export const fetchHistoricalPricesForTransactions = async (transactions = []) => {
  if (!transactions || transactions.length === 0) return {};

  // Get all ticker-date pairs that need prices
  const requests = getPriceRequests(transactions);
  
  if (requests.length === 0) return {};

  // First, check backend for cached prices
  const cachedPrices = await fetchFromBackend(requests);
  
  // Find which prices are missing from cache
  const missingRequests = requests.filter((req) => {
    const key = `${req.ticker}|${req.date}`;
    return !cachedPrices[key];
  });

  // Price map: "ticker|date" -> price
  const priceMap = { ...cachedPrices };

  // Fetch missing prices with rate limiting
  const newPrices = [];
  for (const req of missingRequests) {
    try {
      const assetType = normalizeAssetType(req.assetType);
      let priceData = null;

      if (assetType === 'Crypto') {
        priceData = await rateLimiter.execute(() =>
          fetchHistoricalCryptoPrice(req.ticker, req.date)
        );
      } else if (assetType === 'Commodity') {
        priceData = await rateLimiter.execute(() =>
          fetchHistoricalCommodityPrice(req.ticker, req.date)
        );
      } else {
        priceData = await rateLimiter.execute(() =>
          fetchHistoricalStockPrice(req.ticker, req.date)
        );
      }

      if (priceData && priceData.price) {
        const key = `${req.ticker}|${req.date}`;
        priceMap[key] = priceData.price;

        // Queue for storage in Airtable
        newPrices.push({
          ticker: req.ticker,
          date: req.date,
          price: priceData.price,
          assetType: req.assetType,
        });
      }
    } catch (error) {
      console.error(`Error fetching historical price for ${req.ticker} on ${req.date}:`, error);
    }
  }

  // Store new prices in backend (don't await - fire and forget)
  if (newPrices.length > 0) {
    storeToBackend(newPrices).catch((error) => {
      console.error('Error storing historical prices to backend:', error);
    });
  }

  return priceMap;
};

// Get historical price for a specific ticker and date
export const getHistoricalPrice = (priceMap, ticker, date) => {
  const dateStr = typeof date === 'string' ? date : formatDateToISO(date);
  const key = `${ticker}|${dateStr}`;
  return priceMap[key] || null;
};



