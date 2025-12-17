// centralized list of popular assets for autocomplete
// used in TransactionFormModal for ticker suggestions
// also contains crypto ID mappings for CoinGecko API

export const POPULAR_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", type: "Stock" },
  { ticker: "MSFT", name: "Microsoft Corp.", type: "Stock" },
  { ticker: "GOOGL", name: "Alphabet Inc.", type: "Stock" },
  { ticker: "AMZN", name: "Amazon.com Inc.", type: "Stock" },
  { ticker: "NVDA", name: "NVIDIA Corp.", type: "Stock" },
  { ticker: "TSLA", name: "Tesla Inc.", type: "Stock" },
  { ticker: "META", name: "Meta Platforms Inc.", type: "Stock" },
  { ticker: "BRK.B", name: "Berkshire Hathaway", type: "Stock" },
  { ticker: "V", name: "Visa Inc.", type: "Stock" },
  { ticker: "TSM", name: "Taiwan Semiconductor", type: "Stock" },
  { ticker: "JPM", name: "JPMorgan Chase", type: "Stock" },
];

// crypto ticker to CoinGecko ID mapping (used by api.js for price fetching)
// consolidates data that was previously duplicated in api.js
export const CRYPTO_MAP = {
  BTC: { id: "bitcoin", name: "Bitcoin", logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
  ETH: { id: "ethereum", name: "Ethereum", logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
  SOL: { id: "solana", name: "Solana", logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
  BNB: { id: "binancecoin", name: "Binance Coin", logo: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png" },
  XRP: { id: "ripple", name: "XRP", logo: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png" },
  ADA: { id: "cardano", name: "Cardano", logo: "https://assets.coingecko.com/coins/images/975/small/cardano.png" },
  AVAX: { id: "avalanche-2", name: "Avalanche", logo: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png" },
  DOGE: { id: "dogecoin", name: "Dogecoin", logo: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png" },
  DOT: { id: "polkadot", name: "Polkadot", logo: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png" },
  LINK: { id: "chainlink", name: "Chainlink", logo: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png" },
};

// popular crypto for autocomplete dropdown (derived from CRYPTO_MAP)
export const POPULAR_CRYPTO = Object.entries(CRYPTO_MAP)
  .filter(([ticker]) => ["BTC", "ETH", "SOL", "BNB", "AVAX", "DOGE", "DOT", "LINK"].includes(ticker))
  .map(([ticker, data]) => ({
    ticker,
    name: data.name,
    type: "Crypto",
    logo: data.logo,
  }));

// combines both into a single array
export const SEARCH_ASSETS = [...POPULAR_STOCKS, ...POPULAR_CRYPTO];

// helper to get assets by type
export const getAssetsByType = (type, limit = 6) => {
  const assets = SEARCH_ASSETS.filter(
    (a) => a.type.toLowerCase() === type.toLowerCase()
  );
  return limit ? assets.slice(0, limit) : assets;
};

// helper to find asset by ticker
export const findAssetByTicker = (ticker) => {
  return SEARCH_ASSETS.find((a) => a.ticker === ticker?.toUpperCase());
};

// helper to search assets
export const searchAssets = (query, assetType = null) => {
  const upperQuery = query.toUpperCase();
  return SEARCH_ASSETS.filter((a) => {
    const matchesType =
      !assetType || a.type.toLowerCase() === assetType.toLowerCase();
    const matchesQuery =
      a.ticker.startsWith(upperQuery) ||
      a.name.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  });
};
