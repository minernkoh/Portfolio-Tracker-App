// centralized list of popular assets for autocomplete
// used in TransactionFormModal for ticker suggestions

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

export const POPULAR_CRYPTO = [
  {
    ticker: "BTC",
    name: "Bitcoin",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  },
  {
    ticker: "ETH",
    name: "Ethereum",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    ticker: "SOL",
    name: "Solana",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  },
  {
    ticker: "BNB",
    name: "Binance Coin",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
  },
  {
    ticker: "AVAX",
    name: "Avalanche",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png",
  },
  {
    ticker: "DOGE",
    name: "Dogecoin",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  },
  {
    ticker: "DOT",
    name: "Polkadot",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  },
  {
    ticker: "LINK",
    name: "Chainlink",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  },
];

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
