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
const getAnyCachedPrice = (symbol, cacheKey, reason) => {
  // first, try to get a non-expired cache value
  const freshCache = getCachedPrice(symbol, cacheKey);
  if (freshCache) {
    console.log(`using cached price for ${symbol} (${reason})`);
    return freshCache;
  }

  // if that fails, try to get an expired cache value as a last resort
  try {
    const cached = localStorage.getItem(cacheKey);
    const cacheData = cached ? JSON.parse(cached) : {};
    if (cacheData[symbol]) {
      console.log(`using expired cache for ${symbol} (${reason})`);
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
    return useCache
      ? getAnyCachedPrice(symbol, CACHE_KEY_STOCKS, "api key missing")
      : null;
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
        return getAnyCachedPrice(symbol, CACHE_KEY_STOCKS, "api http error");

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
        return getAnyCachedPrice(symbol, CACHE_KEY_STOCKS, "api data error");

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
        return getAnyCachedPrice(symbol, CACHE_KEY_STOCKS, "api status error");

      return null;
    }

    // extract the price information from the response
    // 'close' is the current price, 'percent_change' is how much it changed in 24 hours
    if (!data.close) {
      console.warn(`no price data (close) for ${symbol}:`, data);
      // try cache as fallback and return null if nothing is found
      return useCache
        ? getAnyCachedPrice(symbol, CACHE_KEY_STOCKS, "no price in response")
        : null;
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
    return useCache
      ? getAnyCachedPrice(symbol, CACHE_KEY_STOCKS, "fetch error")
      : null;
  }
};

export const getStockLogo = (ticker) => {
  // generate a simple avatar with the ticker letters
  return `https://ui-avatars.com/api/?name=${ticker}&background=4f46e5&color=fff&bold=true`;
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

const getCryptoCoinGeckoId = (ticker) => CRYPTO_MAP[ticker]?.id || null;
const getCryptoLogo = (ticker) =>
  CRYPTO_MAP[ticker]?.logo ||
  `https://ui-avatars.com/api/?name=${ticker}&background=random`;

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
    // for example, "BTC" becomes "bitcoin"
    const cryptoIds = uncachedTickers
      .map((ticker) => getCryptoCoinGeckoId(ticker))
      .filter((id) => id !== null);

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
        const cachedPrice = getAnyCachedPrice(
          ticker,
          CACHE_KEY_CRYPTO,
          "api error"
        );
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
      const coinGeckoId = getCryptoCoinGeckoId(ticker);
      if (coinGeckoId && cryptoRetrieved[coinGeckoId]) {
        const liveData = cryptoRetrieved[coinGeckoId];
        // store price data with ticker as key
        const priceData = {
          currentPrice: liveData.usd || 0,
          priceChange24h: liveData.usd_24h_change || 0,
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
        const cachedPrice = getAnyCachedPrice(
          ticker,
          CACHE_KEY_CRYPTO,
          "not in api response"
        );
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
      const cachedPrice = getAnyCachedPrice(
        ticker,
        CACHE_KEY_CRYPTO,
        "fetch error"
      );
      if (cachedPrice) {
        priceMap[ticker] = cachedPrice;
      }
    });

    return populateCryptoLogos(priceMap);
  }
};
