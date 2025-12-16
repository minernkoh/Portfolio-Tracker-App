// get api keys from environment variables (stored in .env file)
const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY;
const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;

// cache configuration - prices are cached for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY_STOCKS = "portfolio_price_cache_stocks";
const CACHE_KEY_CRYPTO = "portfolio_price_cache_crypto";

// get cached price data from localStorage
const getCachedPrice = (ticker, cacheKey) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const tickerData = cacheData[ticker];

    if (!tickerData) return null;

    // check if cache is still valid (within cache duration)
    const now = Date.now();
    const cacheAge = now - tickerData.timestamp;

    if (cacheAge < CACHE_DURATION) {
      return tickerData.data; // return cached data
    }

    return null; // cache expired
  } catch (error) {
    console.warn("error reading price cache:", error);
    return null;
  }
};

// save price data to cache
const setCachedPrice = (ticker, priceData, cacheKey) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    const cacheData = cached ? JSON.parse(cached) : {};

    cacheData[ticker] = {
      data: priceData,
      timestamp: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("error saving price cache:", error);
  }
};

// get all cached prices for multiple tickers
const getCachedPrices = (tickers, cacheKey) => {
  const cachedMap = {};
  const uncachedTickers = [];

  tickers.forEach((ticker) => {
    const cached = getCachedPrice(ticker, cacheKey);
    if (cached) {
      cachedMap[ticker] = cached;
    } else {
      uncachedTickers.push(ticker);
    }
  });

  return { cachedMap, uncachedTickers };
};

// helper function to get any available cached price (fresh or expired)
// this centralizes the fallback logic
const getAnyCachedPrice = (symbol, cacheKey) => {
  // first, try to get a non-expired cache value
  const freshCache = getCachedPrice(symbol, cacheKey);
  if (freshCache) {
    return freshCache;
  }

  // if that fails, try to get an expired cache value as a last resort
  try {
    const cached = localStorage.getItem(cacheKey);
    const cacheData = cached ? JSON.parse(cached) : {};
    if (cacheData[symbol]) {
      return cacheData[symbol].data;
    }
  } catch (e) {
    // ignore cache read errors
  }
  return null;
};

// fetch stock price from twelvedata api
// uses cache as fallback if API fails or rate limited
const fetchStockPrice = async (symbol, useCache = true) => {
  // check cache first if enabled
  if (useCache) {
    const cached = getCachedPrice(symbol, CACHE_KEY_STOCKS);
    if (cached) {
      return cached;
    }
  }

  // check if we have an api key, if not show warning and try cache
  if (!TWELVE_DATA_API_KEY) {
    console.warn("twelvedata api key not found");
    return useCache ? getAnyCachedPrice(symbol, CACHE_KEY_STOCKS) : null;
  }

  try {
    // make a request to twelvedata api to get current stock price
    // the api returns data in json format with price information
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`
    );

    // check if the request was successful
    if (!response.ok) {
      const errorText = await response.text();
      const isRateLimit = response.status === 429 || response.status === 403;

      if (isRateLimit) {
        console.warn(
          `twelvedata rate limit hit for ${symbol}, using cache if available`
        );
      } else {
        console.error(
          `twelvedata api http error for ${symbol}:`,
          response.status,
          errorText
        );
      }

      // try cache as fallback
      if (useCache)
        return getAnyCachedPrice(symbol, CACHE_KEY_STOCKS);

      throw new Error(`http error! status: ${response.status}`);
    }

    // convert the response to javascript object
    const data = await response.json();

    // check if api returned an error message (including rate limits)
    if (data.code && data.code !== 200) {
      const isRateLimit =
        data.message?.toLowerCase().includes("rate limit") ||
        data.message?.toLowerCase().includes("quota");

      if (isRateLimit) {
        console.warn(
          `twelvedata rate limit for ${symbol}, using cache if available`
        );
      } else {
        console.warn(
          `twelvedata api error for ${symbol}:`,
          data.message || data
        );
      }

      // try cache as fallback
      if (useCache)
        return getAnyCachedPrice(symbol, CACHE_KEY_STOCKS);

      return null;
    }

    // check for rate limit or other errors
    if (data.status === "error") {
      const isRateLimit =
        data.message?.toLowerCase().includes("rate limit") ||
        data.message?.toLowerCase().includes("quota");

      if (isRateLimit) {
        console.warn(
          `twelvedata rate limit for ${symbol}, using cache if available`
        );
      } else {
        console.error(
          `twelvedata api error for ${symbol}:`,
          data.message || data
        );
      }

      // try cache as fallback
      if (useCache)
        return getAnyCachedPrice(symbol, CACHE_KEY_STOCKS);

      return null;
    }

    // extract the price information from the response
    // 'close' is the current price, 'percent_change' is how much it changed in 24 hours
    if (!data.close) {
      console.warn(`no price data (close) for ${symbol}:`, data);
      // try cache as fallback and return null if nothing is found
      return useCache ? getAnyCachedPrice(symbol, CACHE_KEY_STOCKS) : null;
    }

    const currentPrice = parseFloat(data.close);
    const priceChange24h = parseFloat(data.percent_change || 0);

    // return an object with all the price data we need
    const priceData = {
      currentPrice,
      priceChange24h,
      high: parseFloat(data.high || 0),
      low: parseFloat(data.low || 0),
      volume: parseInt(data.volume || 0),
      name: data.name || null, // extract company name from API response
    };

    // save to cache for future use
    if (useCache) {
      setCachedPrice(symbol, priceData, CACHE_KEY_STOCKS);
    }

    return priceData;
  } catch (error) {
    // if something goes wrong, log the error and try cache
    console.error(`error fetching stock price for ${symbol}:`, error);

    // try cache as fallback on any other error
    return useCache ? getAnyCachedPrice(symbol, CACHE_KEY_STOCKS) : null;
  }
};

// generate a deterministic color based on ticker (same ticker = same color)
// uses a hash function to convert ticker to a hue value
const getTickerColor = (ticker) => {
  // simple hash function to convert ticker to a number
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // convert hash to a hue value (0-360)
  // use modulo to ensure it's within valid range
  const hue = Math.abs(hash) % 360;
  
  // use consistent saturation (70%) and lightness (50%) for cohesive look
  // convert HSL to hex
  const saturation = 70;
  const lightness = 50;
  
  // convert HSL to RGB, then to hex
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;
  
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
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
  
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const getStockLogo = (ticker) => {
  // generate a simple avatar with the ticker letters
  // use a deterministic random color based on the ticker
  const color = getTickerColor(ticker);
  return `https://ui-avatars.com/api/?name=${ticker}&background=${color}&color=fff&bold=true`;
};

// fetch prices for multiple stock tickers at once
// this function takes an array of tickers like ["AAPL", "TSLA"] and returns prices for all of them
// uses cache to minimize API calls and provide fallback
export const fetchStockPrices = async (tickers = []) => {
  // if no tickers provided, return empty object
  if (!tickers || tickers.length === 0) return {};

  const priceMap = {};
  // remove duplicates and empty tickers
  const uniqueTickers = [...new Set(tickers)].filter((t) => t && t.trim());

  // check cache first for all tickers
  const { cachedMap, uncachedTickers } = getCachedPrices(
    uniqueTickers,
    CACHE_KEY_STOCKS
  );

  // add cached prices to result
  Object.keys(cachedMap).forEach((ticker) => {
    priceMap[ticker] = {
      ...cachedMap[ticker],
      logo: getStockLogo(ticker),
    };
  });

  // only fetch uncached tickers from API
  if (uncachedTickers.length === 0) {
    return priceMap; // all prices from cache
  }

  // limit to 15 tickers to avoid hitting api rate limits
  // free tier of twelvedata allows about 8 requests per minute
  const tickersToFetch = uncachedTickers.slice(0, 15);

  // fetch all prices in parallel with rate limiting
  // use Promise.allSettled to fetch multiple prices concurrently but with delays
  const fetchPromises = tickersToFetch.map(
    (ticker, index) =>
      new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const priceData = await fetchStockPrice(ticker, true); // use cache as fallback
            if (priceData) {
              resolve({
                ticker,
                data: {
                  currentPrice: priceData.currentPrice,
                  priceChange24h: priceData.priceChange24h,
                  logo: getStockLogo(ticker),
                  name: priceData.name || null, // include company name
                },
              });
            } else {
              // if API failed and no cache, use 0 values
              console.warn(`no price data returned for ${ticker}`);
              resolve({
                ticker,
                data: {
                  currentPrice: 0,
                  priceChange24h: 0,
                  logo: getStockLogo(ticker),
                  name: null,
                },
              });
            }
          } catch (error) {
            console.error(`failed to fetch price for ${ticker}:`, error);
            resolve({
              ticker,
              data: {
                currentPrice: 0,
                priceChange24h: 0,
                logo: getStockLogo(ticker),
              },
            });
          }
        }, index * 200); // stagger requests by 200ms
      })
  );

  const results = await Promise.all(fetchPromises);
  results.forEach(({ ticker, data }) => {
    priceMap[ticker] = data;
  });

  return priceMap;
};

// centralized map for crypto data (id and logo)
const CRYPTO_MAP = {
  BTC: {
    id: "bitcoin",
    logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  },
  ETH: {
    id: "ethereum",
    logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  },
  SOL: {
    id: "solana",
    logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  },
  BNB: {
    id: "binancecoin",
    logo: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
  },
  XRP: {
    id: "ripple",
    logo: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  },
  ADA: {
    id: "cardano",
    logo: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  },
  AVAX: {
    id: "avalanche-2",
    logo: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png",
  },
  DOGE: {
    id: "dogecoin",
    logo: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  },
  DOT: {
    id: "polkadot",
    logo: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  },
  LINK: {
    id: "chainlink",
    logo: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  },
};

// cache for dynamically found crypto info (id, name, logo)
const CRYPTO_INFO_CACHE_KEY = "portfolio_crypto_info_cache";
const getCryptoInfoCache = () => {
  try {
    const cached = localStorage.getItem(CRYPTO_INFO_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const setCryptoInfoCache = (ticker, info) => {
  try {
    const cache = getCryptoInfoCache();
    cache[ticker] = info;
    localStorage.setItem(CRYPTO_INFO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache errors
  }
};

// search for crypto by ticker symbol using CoinGecko search API
const searchCryptoByTicker = async (ticker) => {
  // check cache first
  const cache = getCryptoInfoCache();
  if (cache[ticker]) {
    return cache[ticker];
  }

  try {
    const baseUrl = "https://api.coingecko.com/api/v3";
    const headers = {};
    if (COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = COINGECKO_API_KEY;
    }

    // use search API to find coin by ticker symbol
    const response = await fetch(
      `${baseUrl}/search?query=${encodeURIComponent(ticker)}`,
      { headers }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // find exact match by ticker symbol (case-insensitive)
    if (data.coins && Array.isArray(data.coins)) {
      const match = data.coins.find(
        (coin) => coin.symbol?.toUpperCase() === ticker.toUpperCase()
      );

      if (match) {
        const info = {
          id: match.id,
          name: match.name,
          logo: match.large || match.thumb || `https://ui-avatars.com/api/?name=${ticker}&background=random`,
        };
        
        // cache the result
        setCryptoInfoCache(ticker, info);
        return info;
      }
    }

    return null;
  } catch (error) {
    console.error(`error searching for crypto ${ticker}:`, error);
    return null;
  }
};

const getCryptoCoinGeckoId = (ticker) => CRYPTO_MAP[ticker]?.id || null;
const getCryptoLogo = (ticker) =>
  CRYPTO_MAP[ticker]?.logo ||
  `https://ui-avatars.com/api/?name=${ticker}&background=random`;

// get crypto info (id, name, logo) - checks hardcoded map first, then searches dynamically
export const getCryptoInfo = async (ticker) => {
  // check hardcoded map first
  if (CRYPTO_MAP[ticker]) {
    return {
      id: CRYPTO_MAP[ticker].id,
      name: ticker, // will be overridden if we fetch from API
      logo: CRYPTO_MAP[ticker].logo,
    };
  }

  // check cache
  const cache = getCryptoInfoCache();
  if (cache[ticker]) {
    return cache[ticker];
  }

  // search dynamically
  const info = await searchCryptoByTicker(ticker);
  if (info) {
    return info;
  }

  // fallback if not found
  return {
    id: null,
    name: ticker,
    logo: `https://ui-avatars.com/api/?name=${ticker}&background=random`,
  };
};

// helper to populate logos for a given price map
const populateCryptoLogos = (priceMap) => {
  const newPriceMap = { ...priceMap };
  Object.keys(newPriceMap).forEach((ticker) => {
    if (newPriceMap[ticker]) {
      newPriceMap[ticker].logo = getCryptoLogo(ticker);
    }
  });
  return newPriceMap;
};

// fetch crypto prices from coingecko api
// this function takes an array of crypto tickers like ["BTC", "ETH"] and returns prices
// uses cache to minimize API calls and provide fallback
export const fetchCryptoPrices = async (cryptoTickers = []) => {
  if (!cryptoTickers || cryptoTickers.length === 0) return {};

  const { cachedMap, uncachedTickers } = getCachedPrices(
    cryptoTickers,
    CACHE_KEY_CRYPTO
  );

  let priceMap = { ...cachedMap };

  if (uncachedTickers.length === 0) {
    return populateCryptoLogos(priceMap);
  }

  try {
    // convert ticker symbols to coingecko ids
    // first, get ids from hardcoded map
    const tickerToIdMap = {};
    const tickersNeedingSearch = [];

    for (const ticker of uncachedTickers) {
      const hardcodedId = getCryptoCoinGeckoId(ticker);
      if (hardcodedId) {
        tickerToIdMap[ticker] = hardcodedId;
      } else {
        tickersNeedingSearch.push(ticker);
      }
    }

    // search for tickers not in hardcoded map
    if (tickersNeedingSearch.length > 0) {
      const searchPromises = tickersNeedingSearch.map(async (ticker) => {
        const info = await searchCryptoByTicker(ticker);
        if (info && info.id) {
          tickerToIdMap[ticker] = info.id;
        }
        return { ticker, info };
      });

      await Promise.all(searchPromises);
    }

    const cryptoIds = Object.values(tickerToIdMap).filter((id) => id !== null);

    // if no valid ids found, return cached data only
    if (cryptoIds.length === 0) {
      return populateCryptoLogos(priceMap);
    }

    // join all ids with commas for the api request
    // example: "bitcoin,ethereum,solana"
    const ids = cryptoIds.join(",");

    // coingecko api base url
    const baseUrl = "https://api.coingecko.com/api/v3";

    // prepare headers - add api key if we have one
    const headers = {};
    if (COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = COINGECKO_API_KEY;
    }

    // make request to coingecko api
    // vs_currencies=usd means we want prices in us dollars
    // include_24hr_change=true means we want the 24 hour price change percentage
    const response = await fetch(
      `${baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers }
    );

    // check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      const isRateLimit = response.status === 429 || response.status === 403;

      if (isRateLimit) {
        console.warn("coingecko rate limit hit, using cache if available");
      } else {
        console.error("coingecko api error:", response.status, errorText);
      }

      // try to get from cache (even expired) for uncached tickers
      uncachedTickers.forEach((ticker) => {
        const cachedPrice = getAnyCachedPrice(ticker, CACHE_KEY_CRYPTO);
        if (cachedPrice) {
          priceMap[ticker] = cachedPrice;
        }
      });
      return populateCryptoLogos(priceMap);
    }

    // convert response to javascript object
    const cryptoRetrieved = await response.json();

    // map the results back to ticker symbols
    // coingecko returns data with coin ids as keys, we need to convert back to tickers
    uncachedTickers.forEach((ticker) => {
      const coinGeckoId = tickerToIdMap[ticker] || getCryptoCoinGeckoId(ticker);
      if (coinGeckoId && cryptoRetrieved[coinGeckoId]) {
        const liveData = cryptoRetrieved[coinGeckoId];
        
        // get crypto info for name and logo
        const cache = getCryptoInfoCache();
        const cryptoInfo = cache[ticker] || CRYPTO_MAP[ticker];
        
        // store price data with ticker as key
        const priceData = {
          currentPrice: liveData.usd || 0,
          priceChange24h: liveData.usd_24h_change || 0,
          name: cryptoInfo?.name || ticker,
          logo: cryptoInfo?.logo || getCryptoLogo(ticker),
        };
        priceMap[ticker] = priceData;

        // save to cache
        setCachedPrice(
          ticker,
          {
            currentPrice: priceData.currentPrice,
            priceChange24h: priceData.priceChange24h,
          },
          CACHE_KEY_CRYPTO
        );
      } else {
        // if API didn't return data for a specific ticker, try cache for it
        const cachedPrice = getAnyCachedPrice(ticker, CACHE_KEY_CRYPTO);
        if (cachedPrice) {
          priceMap[ticker] = cachedPrice;
        }
      }
    });

    return populateCryptoLogos(priceMap);
  } catch (error) {
    console.error("error fetching crypto prices:", error);

    // try to get from cache (even expired) for uncached tickers
    uncachedTickers.forEach((ticker) => {
      const cachedPrice = getAnyCachedPrice(ticker, CACHE_KEY_CRYPTO);
      if (cachedPrice) {
        priceMap[ticker] = cachedPrice;
      }
    });

    return populateCryptoLogos(priceMap);
  }
};
