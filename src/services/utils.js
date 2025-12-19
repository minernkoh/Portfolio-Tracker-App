// this file contains helper functions used throughout the app
// these are utility functions that format numbers and calculate values

// format a number with up to 10 decimal places, showing only what's necessary
// example: formatNumber(1.50000000) returns "1.5"
export const formatNumber = (value, maxDecimals = 10) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  
  const num = Number(value);
  if (!isFinite(num)) return String(value);
  
  // handle zero
  if (num === 0) return "0";
  
  // use toFixed to avoid scientific notation, then parse
  // use a higher precision to avoid rounding issues
  const fixedStr = num.toFixed(Math.max(maxDecimals, 15));
  
  // split into integer and decimal parts
  const parts = fixedStr.split(".");
  let integerPart = parts[0];
  let decimalPart = parts[1] || "";
  
  // limit decimal part to maxDecimals
  if (decimalPart.length > maxDecimals) {
    decimalPart = decimalPart.substring(0, maxDecimals);
  }
  
  // remove trailing zeros from decimal part
  decimalPart = decimalPart.replace(/0+$/, "");
  
  // format integer part with thousand separators
  const formattedInteger = Number(integerPart).toLocaleString("en-US");
  
  // return formatted number
  if (decimalPart.length === 0) {
    return formattedInteger;
  }
  
  return `${formattedInteger}.${decimalPart}`;
};

// format a price with appropriate decimal places based on value
// for prices >= $1: use 2 decimal places
// for prices < $1: preserve significant digits (find first non-zero digit + 4 more)
// example: formatPriceInput(100.5) returns "100.50"
// example: formatPriceInput(0.00001234) returns "0.00001234"
export const formatPriceInput = (price) => {
  if (price === null || price === undefined || isNaN(price)) return "";
  
  const num = Number(price);
  if (num === 0) return "0.00";
  
  // for prices $1 and above, use 2 decimal places
  if (Math.abs(num) >= 1) {
    return num.toFixed(2);
  }
  
  // for prices less than $1, find significant digits
  // convert to string and find the first non-zero digit after decimal
  const str = num.toFixed(12); // high precision to find significant digits
  const decimalIndex = str.indexOf(".");
  
  if (decimalIndex === -1) return num.toFixed(2);
  
  const afterDecimal = str.slice(decimalIndex + 1);
  let firstNonZeroIndex = 0;
  
  for (let i = 0; i < afterDecimal.length; i++) {
    if (afterDecimal[i] !== "0") {
      firstNonZeroIndex = i;
      break;
    }
  }
  
  // show first significant digit + 3 more digits (4 significant figures after first non-zero)
  const decimals = Math.min(firstNonZeroIndex + 4, 10);
  return num.toFixed(decimals);
};

// format a number as US dollars (money format) - always exactly 2 decimal places
// example: formatCurrency(1000) returns "$1,000.00"
// example: formatCurrency(0.001) returns "$0.00"
export const formatCurrency = (value, hidden = false) => {
  // privacy feature - hide sensitive financial data
  if (hidden) return "****";

  if (value === null || value === undefined || isNaN(value)) return "$0.00";
  
  const num = Number(value);
  if (!isFinite(num)) return "$0.00";
  
  // use javascript's built-in number formatter for US dollars
  // Intl.NumberFormat handles locale-specific formatting (commas, currency symbol)
  // always show exactly 2 decimal places for consistency
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2, // always show 2 decimal places
    maximumFractionDigits: 2, // never show more than 2 decimal places
  }).format(num);
};

// format a quantity (for crypto or stocks) with up to 10 decimal places
export const formatQuantity = (value) => {
  return formatNumber(value, 10);
};

// format a quantity to 4 significant figures (used for stocks shares display)
export const formatQuantity4SF = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  
  const num = Number(value);
  if (!isFinite(num)) return String(value);
  if (num === 0) return "0";
  
  // convert to 4 significant figures using toPrecision
  const precisionStr = num.toPrecision(4);
  const precisionNum = parseFloat(precisionStr);
  
  // split into integer and decimal parts
  const parts = precisionStr.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "";
  
  // format integer part with thousand separators
  const formattedInteger = Number(integerPart).toLocaleString("en-US");
  
  // if there's a decimal part, add it back (removing trailing zeros)
  if (decimalPart) {
    const cleanedDecimal = decimalPart.replace(/0+$/, "");
    if (cleanedDecimal) {
      return `${formattedInteger}.${cleanedDecimal}`;
    }
  }
  
  return formattedInteger;
};

// format a price with appropriate notation
// for prices < 0.01: use scientific notation (e.g., "$7.05e-6")
// for prices >= 0.01: use standard currency format (e.g., "$0.50")
// for prices >= 1: use standard currency format with 2 decimals (e.g., "$1,234.56")
export const formatPrice = (value, hidden = false) => {
  // privacy feature - hide sensitive financial data
  if (hidden) return "****";

  if (value === null || value === undefined || isNaN(value)) return "$0.00";
  
  const num = Number(value);
  if (!isFinite(num)) return "$0.00";
  if (num === 0) return "$0.00";
  
  // for very small prices (< 0.01), use scientific notation
  if (Math.abs(num) < 0.01) {
    // format as $X.XXe±YY
    const formatted = num.toExponential(2);
    return `$${formatted}`;
  }
  
  // for prices >= 0.01, use standard currency format
  // use more decimal places for prices between 0.01 and 1
  if (Math.abs(num) >= 0.01 && Math.abs(num) < 1) {
    // show up to 4 decimal places for prices less than $1
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  }
  
  // for prices >= $1, use standard 2 decimal format
  return formatCurrency(num);
};

// truncate a string to a maximum length and add ellipsis if needed
// example: truncateName("Apple Inc.", 10) returns "Apple Inc."
// example: truncateName("International Business Machines Corporation", 20) returns "International Busin..."
export const truncateName = (name, maxLength = 30) => {
  if (!name || typeof name !== "string") return name;
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + "...";
};

// format a date string to show date and time nicely
// accepts either: 
// - a full datetime string like "2024-01-15T14:30:00Z"
// - separate date and time parameters like ("2024-01-15", "14:30")
// example: formatDateTime("2024-01-15", "14:30") returns "2024-01-15, 14:30"
export const formatDateTime = (dateString, timeString) => {
  if (!dateString) return "";
  
  // if timeString is provided as second argument, combine them
  if (timeString) {
    return `${dateString}, ${timeString}`;
  }
  
  // check if dateString already contains time (ISO format with T)
  if (dateString.includes("T")) {
    try {
      const date = new Date(dateString);
      // format as YYYY-MM-DD HH:MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      // if parsing fails, try to clean up the string by removing T and Z
      return dateString.replace("T", " ").replace(/Z$/, "").substring(0, 16);
    }
  }
  
  // if no time info, just return the date
  return dateString;
};

// calculate the total value of an asset
export const calculateValue = (quantity, price) => {
  return quantity * price;
};

// calculate unrealized profit or loss
export const calculateUnrealizedPnL = (quantity, avgPrice, currentPrice) => {
  const cost = quantity * avgPrice; // cost basis
  const current = quantity * currentPrice; // what it's worth now
  return current - cost; // profit (positive) or loss (negative)
};

// normalize asset type to "Stock" or "Crypto"
// handles various input formats and normalizes to standard format
export const normalizeAssetType = (assetType) => {
  if (!assetType) return "Stock";
  
  if (typeof assetType === "string") {
    const normalized = assetType.trim().replace(/\n/g, "").toLowerCase();
    return normalized === "crypto" ? "Crypto" : "Stock";
  }
  
  return "Stock";
};

// format transaction type to "Buy" or "Sell" with proper capitalization
export const formatTransactionType = (type) => {
  if (!type) return "Buy";
  
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

// calculate profit/loss percentage from PnL and cost basis
// returns formatted percentage string (e.g., "5.25" for 5.25%)
// returns "0.00" if cost basis is 0 or invalid
export const calculatePnLPercentage = (pnl, costBasis) => {
  if (!costBasis || costBasis <= 0 || isNaN(pnl) || isNaN(costBasis)) {
    return "0.00";
  }
  return ((pnl / costBasis) * 100).toFixed(2);
};

// format 24h price change with arrow indicator
// returns object with { value, formatted, isPositive, arrow }
export const format24hChange = (changePercent) => {
  const isPositive = changePercent >= 0;
  const arrow = isPositive ? "▲" : "▼";
  const formatted = Math.abs(changePercent).toFixed(2);
  return {
    value: changePercent,
    formatted,
    isPositive,
    arrow,
    display: `${arrow} ${formatted}%`,
  };
};

/**
 * calculate portfolio data from transactions and current prices
 * uses FIFO (First In, First Out) accounting: oldest shares sold first
 */
export const calculatePortfolioData = (transactions, prices) => {
  // phase 1: sort transactions chronologically (oldest first) - required for FIFO
  // secondary sort: buys before sells when timestamps are equal
  const sortedTransactions = [...transactions].sort((a, b) => {
    // combine date and time for comparison (e.g., "2024-01-15T14:30")
    const dateTimeA = a.time ? `${a.date}T${a.time}` : a.date;
    const dateTimeB = b.time ? `${b.date}T${b.time}` : b.date;
    const dateA = new Date(dateTimeA);
    const dateB = new Date(dateTimeB);
    
    // primary sort: by date/time (ascending = oldest first)
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    
    // secondary sort: buys before sells (cannot sell what is not owned)
    // convert transaction type to number for sorting:
    //   - "Buy" → 0 (comes first)
    //   - "Sell" → 1 (comes after)

    // example: a.type = "Buy"
    //   step 1: "Buy".toLowerCase() = "buy"
    //   step 2: "buy" === "buy" = true
    //   step 3: true ? 0 : 1 = 0
    //   result: typeA = 0 ✅
    const typeA = a.type?.toLowerCase() === "buy" ? 0 : 1;
    const typeB = b.type?.toLowerCase() === "buy" ? 0 : 1;

    // sort by numeric value: negative = A comes first, positive = B comes first, 0 = same order
    // example: typeA = 0 (Buy), typeB = 1 (Sell) → 0 - 1 = -1 → A comes before B ✅
    return typeA - typeB;
  });

  // phase 2: process transactions - group by ticker and track holdings
  const assetMap = {};

  sortedTransactions.forEach((tx) => {
    const ticker = tx.ticker;

    // initialize asset entry for new ticker
    // buyQueue: FIFO queue tracking remaining shares from each buy (oldest first)
    if (!assetMap[ticker]) {
      assetMap[ticker] = {
        ticker: ticker,
        name: tx.name || ticker,
        assetType: normalizeAssetType(tx.assetType),
        transactions: [],
        totalQuantity: 0, // current holdings
        totalCost: 0, // cost basis (total money spent)
        buyQueue: [], // [{quantity, price, originalQuantity}] - oldest buys first
      };
    }

    assetMap[ticker].transactions.push(tx);

    // process buy: increase holdings, cost basis, and add to FIFO queue
    if (tx.type.toLowerCase() === "buy") {
      assetMap[ticker].totalQuantity += tx.quantity;
      assetMap[ticker].totalCost += tx.quantity * tx.price;
      // add to queue (oldest buys at index 0, newest at end)
      assetMap[ticker].buyQueue.push({
        quantity: tx.quantity,
        price: tx.price,
        originalQuantity: tx.quantity,
      });
      // process sell: use FIFO - sell oldest shares first 
      // example: buy 10 @ $100, buy 5 @ $120, sell 8 → sell 8 from first buy (cost: 8 × $100 = $800)
    } else {
      let remainingToSell = tx.quantity;
      let costOfSoldShares = 0; // track cost basis of shares being sold

      // loop through buy queue (oldest first) until all shares sold
      for (
        let i = 0;
        i < assetMap[ticker].buyQueue.length && remainingToSell > 0;
        i++
      ) {
        const buyEntry = assetMap[ticker].buyQueue[i];
        if (buyEntry.quantity <= 0) continue; // skip exhausted buys

        // sell minimum of: remaining to sell OR available from this buy
        const sharesFromThisBuy = Math.min(remainingToSell, buyEntry.quantity);
        costOfSoldShares += sharesFromThisBuy * buyEntry.price;
        buyEntry.quantity -= sharesFromThisBuy;
        remainingToSell -= sharesFromThisBuy;
      }

      // update holdings and cost basis (subtract cost of sold shares, not sell price)
      assetMap[ticker].totalQuantity -= tx.quantity;
      assetMap[ticker].totalCost -= costOfSoldShares;
    }
  });

  // phase 3: calculate metrics and return results
  return Object.values(assetMap)
    .filter((asset) => asset.totalQuantity > 0) // only assets still owned
    .map((asset) => {
      // get current price data (fallback to defaults if API data unavailable)
      const priceData = prices[asset.ticker] || {
        currentPrice: 0,
        priceChange24h: 0,
        logo: null,
        name: null,
      };

      // determine display name: transaction name > API name > ticker
      const hasRealName = asset.name && asset.name !== asset.ticker;
      const companyName = hasRealName
        ? asset.name
        : priceData.name || asset.ticker;

      // calculate average buy price: totalCost / totalQuantity
      // example: $800 cost / 7 shares = $114.29 per share
      const avgPrice =
        asset.totalQuantity > 0 ? asset.totalCost / asset.totalQuantity : 0;

      // calculate current market value: quantity × currentPrice
      const totalValue = calculateValue(
        asset.totalQuantity,
        priceData.currentPrice
      );

      // calculate profit/loss (unrealized): currentValue - costBasis
      // example: $1,050 value - $800 cost = $250 profit
      const pnl = calculateUnrealizedPnL(
        asset.totalQuantity,
        avgPrice,
        priceData.currentPrice
      );

      return {
        id: asset.ticker,
        ticker: asset.ticker,
        name: companyName,
        assetType: asset.assetType,
        quantity: asset.totalQuantity,
        avgPrice: avgPrice,
        totalCost: asset.totalCost,
        currentPrice: priceData.currentPrice,
        priceChange24h: priceData.priceChange24h,
        totalValue: totalValue,
        pnl: pnl,
        logo: priceData.logo,
        transactions: asset.transactions,
      };
    });
};
