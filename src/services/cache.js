// centralized caching utilities for localStorage
// reduces duplication in api.js

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// generic cache getter with expiration check
export const getFromCache = (key, ticker, duration = DEFAULT_CACHE_DURATION) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const tickerData = cacheData[ticker];
    if (!tickerData) return null;

    const cacheAge = Date.now() - tickerData.timestamp;
    return cacheAge < duration ? tickerData.data : null;
  } catch {
    return null;
  }
};

// generic cache setter
export const setToCache = (key, ticker, data) => {
  try {
    const cached = localStorage.getItem(key);
    const cacheData = cached ? JSON.parse(cached) : {};
    cacheData[ticker] = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch {
    // ignore cache write errors
  }
};

// get any cached value (fresh or expired) - fallback for API failures
export const getAnyCached = (key, ticker) => {
  const fresh = getFromCache(key, ticker);
  if (fresh) return fresh;

  try {
    const cached = localStorage.getItem(key);
    const cacheData = cached ? JSON.parse(cached) : {};
    return cacheData[ticker]?.data || null;
  } catch {
    return null;
  }
};

// batch check cache for multiple tickers
export const getCachedBatch = (key, tickers, duration = DEFAULT_CACHE_DURATION) => {
  const cachedMap = {};
  const uncachedTickers = [];

  tickers.forEach((ticker) => {
    const cached = getFromCache(key, ticker, duration);
    if (cached) {
      cachedMap[ticker] = cached;
    } else {
      uncachedTickers.push(ticker);
    }
  });

  return { cachedMap, uncachedTickers };
};

// simple key-value cache (for crypto info, etc.)
export const getSimpleCache = (key) => {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

export const setSimpleCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore errors
  }
};

