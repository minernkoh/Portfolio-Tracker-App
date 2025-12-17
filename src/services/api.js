// api services for fetching stock and crypto prices
// uses centralized caching utilities for localStorage

import { getFromCache, setToCache, getAnyCached, getCachedBatch, getSimpleCache, setSimpleCache } from './cache';
import { CRYPTO_MAP } from '../constants/assets';

const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY;
const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;

const CACHE_KEY_STOCKS = "portfolio_price_cache_stocks";
const CACHE_KEY_CRYPTO = "portfolio_price_cache_crypto";
const CRYPTO_INFO_CACHE_KEY = "portfolio_crypto_info_cache";

// API request counter - tracks API requests for debugging and monitoring
const apiRequestCounter = {
  twelveData: 0,
  coinGecko: 0,
  coinGeckoSearch: 0,
  sessionStart: new Date().toISOString(),
};

// log and increment counter for API requests
const logApiRequest = (api, symbols, fromCache = false) => {
  if (fromCache) {
    console.log(`📦 [${api}] Cache hit - ${symbols.length} symbol(s): ${symbols.join(', ')}`);
    return;
  }
  
  apiRequestCounter[api]++;
  const total = apiRequestCounter.twelveData + apiRequestCounter.coinGecko + apiRequestCounter.coinGeckoSearch;
  
  console.log(
    `🌐 [${api}] API Request #${apiRequestCounter[api]} | ` +
    `${symbols.length} symbol(s): ${symbols.join(', ')} | ` +
    `Total requests this session: ${total}`
  );
};

// export counter for console access: apiStats.get(), apiStats.reset()
export const apiStats = {
  get: () => {
    const total = apiRequestCounter.twelveData + apiRequestCounter.coinGecko + apiRequestCounter.coinGeckoSearch;
    console.table({
      'Twelve Data (stocks)': apiRequestCounter.twelveData,
      'CoinGecko (prices)': apiRequestCounter.coinGecko,
      'CoinGecko (search)': apiRequestCounter.coinGeckoSearch,
      'Total': total,
      'Session started': apiRequestCounter.sessionStart,
    });
    return apiRequestCounter;
  },
  reset: () => {
    apiRequestCounter.twelveData = 0;
    apiRequestCounter.coinGecko = 0;
    apiRequestCounter.coinGeckoSearch = 0;
    apiRequestCounter.sessionStart = new Date().toISOString();
    console.log('🔄 API request counters reset');
  },
};

// make apiStats available in browser console
if (typeof window !== 'undefined') {
  window.apiStats = apiStats;
}

// generate deterministic color from ticker for avatar
const getTickerColor = (ticker) => {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  const h = hue / 360, s = 0.7, l = 0.5;
  
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const getStockLogo = (ticker) => {
  const color = getTickerColor(ticker);
  return `https://ui-avatars.com/api/?name=${ticker}&background=${color}&color=fff&bold=true`;
};

const getCryptoLogo = (ticker) =>
  CRYPTO_MAP[ticker]?.logo || `https://ui-avatars.com/api/?name=${ticker}&background=random`;

// check if response indicates rate limiting
const isRateLimited = (response, data) => {
  if (response.status === 429 || response.status === 403) return true;
  if (data?.message?.toLowerCase().includes("rate limit")) return true;
  if (data?.message?.toLowerCase().includes("quota")) return true;
  return false;
};

// parse stock data from TwelveData response
const parseStockData = (data) => {
  if (!data?.close) return null;
  return {
    currentPrice: parseFloat(data.close),
    priceChange24h: parseFloat(data.percent_change || 0),
    high: parseFloat(data.high || 0),
    low: parseFloat(data.low || 0),
    volume: parseInt(data.volume || 0),
    name: data.name || null,
  };
};

// fetch prices for multiple stocks using batch request (1 API call for all symbols)
export const fetchStockPrices = async (tickers = []) => {
  if (!tickers?.length) return {};

  const uniqueTickers = [...new Set(tickers)].filter((t) => t?.trim());
  const { cachedMap, uncachedTickers } = getCachedBatch(CACHE_KEY_STOCKS, uniqueTickers);
  
  const priceMap = {};
  Object.keys(cachedMap).forEach((ticker) => {
    priceMap[ticker] = { ...cachedMap[ticker], logo: getStockLogo(ticker) };
  });

  if (uncachedTickers.length === 0) {
    if (Object.keys(cachedMap).length > 0) {
      logApiRequest('twelveData', Object.keys(cachedMap), true);
    }
    return priceMap;
  }

  if (!TWELVE_DATA_API_KEY) {
    console.warn("TwelveData API key not found");
    uncachedTickers.forEach((ticker) => {
      const cached = getAnyCached(CACHE_KEY_STOCKS, ticker);
      priceMap[ticker] = cached 
        ? { ...cached, logo: getStockLogo(ticker) }
        : { currentPrice: 0, priceChange24h: 0, logo: getStockLogo(ticker), name: null };
    });
    return priceMap;
  }

  try {
    // batch request: fetch all symbols in one API call
    const symbolsParam = uncachedTickers.join(',');
    logApiRequest('twelveData', uncachedTickers);
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbolsParam}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!response.ok) {
      if (isRateLimited(response)) {
        console.warn("TwelveData rate limit hit, using cache");
      }
      // fall back to cached data
      uncachedTickers.forEach((ticker) => {
        const cached = getAnyCached(CACHE_KEY_STOCKS, ticker);
        priceMap[ticker] = cached 
          ? { ...cached, logo: getStockLogo(ticker) }
          : { currentPrice: 0, priceChange24h: 0, logo: getStockLogo(ticker), name: null };
      });
      return priceMap;
    }

    const data = await response.json();

    // handle response format:
    // - single symbol: { close: "150", name: "Apple", ... }
    // - multiple symbols: { "AAPL": { close: "150", ... }, "MSFT": { close: "380", ... } }
    const isSingleSymbol = uncachedTickers.length === 1;

    uncachedTickers.forEach((ticker) => {
      const stockData = isSingleSymbol ? data : data[ticker];
      const parsed = parseStockData(stockData);

      if (parsed) {
        priceMap[ticker] = {
          currentPrice: parsed.currentPrice,
          priceChange24h: parsed.priceChange24h,
          logo: getStockLogo(ticker),
          name: parsed.name,
        };
        setToCache(CACHE_KEY_STOCKS, ticker, parsed);
      } else {
        // use cached data or default
        const cached = getAnyCached(CACHE_KEY_STOCKS, ticker);
        priceMap[ticker] = cached 
          ? { ...cached, logo: getStockLogo(ticker) }
          : { currentPrice: 0, priceChange24h: 0, logo: getStockLogo(ticker), name: null };
      }
    });

    return priceMap;
  } catch (error) {
    console.error("Error fetching stock prices:", error);
    uncachedTickers.forEach((ticker) => {
      const cached = getAnyCached(CACHE_KEY_STOCKS, ticker);
      priceMap[ticker] = cached 
        ? { ...cached, logo: getStockLogo(ticker) }
        : { currentPrice: 0, priceChange24h: 0, logo: getStockLogo(ticker), name: null };
    });
    return priceMap;
  }
};

// search for crypto by ticker using CoinGecko
const searchCryptoByTicker = async (ticker) => {
  const cache = getSimpleCache(CRYPTO_INFO_CACHE_KEY);
  if (cache[ticker]) return cache[ticker];

  try {
    const headers = COINGECKO_API_KEY ? { "x-cg-demo-api-key": COINGECKO_API_KEY } : {};
    logApiRequest('coinGeckoSearch', [ticker]);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(ticker)}`,
      { headers }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const match = data.coins?.find((coin) => coin.symbol?.toUpperCase() === ticker.toUpperCase());

    if (match) {
      const info = {
        id: match.id,
        name: match.name,
        logo: match.large || match.thumb || `https://ui-avatars.com/api/?name=${ticker}&background=random`,
      };
      cache[ticker] = info;
      setSimpleCache(CRYPTO_INFO_CACHE_KEY, cache);
      return info;
    }
    return null;
  } catch {
    return null;
  }
};

// get crypto info (id, name, logo)
export const getCryptoInfo = async (ticker) => {
  if (CRYPTO_MAP[ticker]) {
    return { id: CRYPTO_MAP[ticker].id, name: ticker, logo: CRYPTO_MAP[ticker].logo };
  }

  const cache = getSimpleCache(CRYPTO_INFO_CACHE_KEY);
  if (cache[ticker]) return cache[ticker];

  const info = await searchCryptoByTicker(ticker);
  return info || { id: null, name: ticker, logo: `https://ui-avatars.com/api/?name=${ticker}&background=random` };
};

// add logos to price map
const populateCryptoLogos = (priceMap) => {
  const result = { ...priceMap };
  Object.keys(result).forEach((ticker) => {
    if (result[ticker]) result[ticker].logo = getCryptoLogo(ticker);
  });
  return result;
};

// fetch prices for multiple cryptocurrencies
export const fetchCryptoPrices = async (cryptoTickers = []) => {
  if (!cryptoTickers?.length) return {};

  const { cachedMap, uncachedTickers } = getCachedBatch(CACHE_KEY_CRYPTO, cryptoTickers);
  let priceMap = { ...cachedMap };

  if (uncachedTickers.length === 0) {
    if (Object.keys(cachedMap).length > 0) {
      logApiRequest('coinGecko', Object.keys(cachedMap), true);
    }
    return populateCryptoLogos(priceMap);
  }

  try {
    // map tickers to CoinGecko IDs
    const tickerToIdMap = {};
    const tickersNeedingSearch = [];

    for (const ticker of uncachedTickers) {
      if (CRYPTO_MAP[ticker]?.id) {
        tickerToIdMap[ticker] = CRYPTO_MAP[ticker].id;
      } else {
        tickersNeedingSearch.push(ticker);
      }
    }

    // search for unknown tickers
    if (tickersNeedingSearch.length > 0) {
      await Promise.all(
        tickersNeedingSearch.map(async (ticker) => {
          const info = await searchCryptoByTicker(ticker);
          if (info?.id) tickerToIdMap[ticker] = info.id;
        })
      );
    }

    const cryptoIds = Object.values(tickerToIdMap).filter(Boolean);
    if (cryptoIds.length === 0) return populateCryptoLogos(priceMap);

    const headers = COINGECKO_API_KEY ? { "x-cg-demo-api-key": COINGECKO_API_KEY } : {};
    logApiRequest('coinGecko', uncachedTickers);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      { headers }
    );

    if (!response.ok) {
      uncachedTickers.forEach((ticker) => {
        const cached = getAnyCached(CACHE_KEY_CRYPTO, ticker);
        if (cached) priceMap[ticker] = cached;
      });
      return populateCryptoLogos(priceMap);
    }

    const cryptoData = await response.json();
    const infoCache = getSimpleCache(CRYPTO_INFO_CACHE_KEY);

    uncachedTickers.forEach((ticker) => {
      const coinGeckoId = tickerToIdMap[ticker] || CRYPTO_MAP[ticker]?.id;
      if (coinGeckoId && cryptoData[coinGeckoId]) {
        const liveData = cryptoData[coinGeckoId];
        const cryptoInfo = infoCache[ticker] || CRYPTO_MAP[ticker];
        
        const priceData = {
          currentPrice: liveData.usd || 0,
          priceChange24h: liveData.usd_24h_change || 0,
          name: cryptoInfo?.name || ticker,
          logo: cryptoInfo?.logo || getCryptoLogo(ticker),
        };
        priceMap[ticker] = priceData;
        setToCache(CACHE_KEY_CRYPTO, ticker, { currentPrice: priceData.currentPrice, priceChange24h: priceData.priceChange24h });
      } else {
        const cached = getAnyCached(CACHE_KEY_CRYPTO, ticker);
        if (cached) priceMap[ticker] = cached;
      }
    });

    return populateCryptoLogos(priceMap);
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    uncachedTickers.forEach((ticker) => {
      const cached = getAnyCached(CACHE_KEY_CRYPTO, ticker);
      if (cached) priceMap[ticker] = cached;
    });
    return populateCryptoLogos(priceMap);
  }
};
