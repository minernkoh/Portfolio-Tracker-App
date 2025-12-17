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

// format a number as US dollars (money format) - always exactly 2 decimal places
// example: formatCurrency(1000) returns "$1,000.00"
// example: formatCurrency(0.001) returns "$0.00"
export const formatCurrency = (value, hidden = false) => {
  // privacy feature, for hiding numbers
  if (hidden) return "****";

  if (value === null || value === undefined || isNaN(value)) return "$0.00";
  
  const num = Number(value);
  if (!isFinite(num)) return "$0.00";
  
  // use javascript's built-in number formatter for US dollars
  // always show exactly 2 decimal places
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2, // always show 2 decimal places
    maximumFractionDigits: 2, // never show more than 2 decimal places
  }).format(num);
};

// format a quantity (for crypto or stocks) with dynamic decimal places
// example: formatQuantity(1.5) returns "1.5"
// example: formatQuantity(0.00012345) returns "0.00012345"
export const formatQuantity = (value) => {
  return formatNumber(value, 10);
};

// format a number as a percentage
// example: formatPercentage(5) returns "+5.00%"
export const formatPercentage = (value) => {
  // use javascript's built-in number formatter for percentages
  const formatted = new Intl.NumberFormat("en-US", {
    style: "percent", // format as percentage
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100); // divide by 100 because formatter expects decimal (0.05 = 5%)

  // add + sign if value is positive
  return value > 0 ? `+${formatted}` : formatted;
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
  const cost = quantity * avgPrice; // what you paid
  const current = quantity * currentPrice; // what it's worth now
  return current - cost; // profit (positive) or loss (negative)
};

// get css class name based on whether value is positive, negative, or zero
// this is used to color numbers green (profit) or red (loss)
export const getClassByValue = (value) => {
  if (value > 0) return "text-[var(--accent-success)]"; // green for positive
  if (value < 0) return "text-[var(--accent-danger)]"; // red for negative
  return "text-[var(--text-secondary)]"; // gray for zero
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

// calculate portfolio data from transactions and prices
// this combines buy/sell history with current prices to show portfolio value
// uses FIFO (first in, first out) for sell calculations
export const calculatePortfolioData = (transactions, prices) => {
  // sort transactions by date (oldest first) - required for FIFO to work correctly
  // FIFO needs to process transactions in chronological order to determine which shares were sold
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB; // ascending order (oldest first)
  });

  // group transactions by ticker (asset symbol)
  const assetMap = {};

  sortedTransactions.forEach((tx) => {
    const ticker = tx.ticker;

    // if we haven't seen this ticker before, create a new entry
    if (!assetMap[ticker]) {
      assetMap[ticker] = {
        ticker: ticker,
        name: tx.name || ticker,
        assetType: normalizeAssetType(tx.assetType),
        transactions: [],
        totalQuantity: 0,
        totalCost: 0,
        // track remaining available shares per buy transaction for FIFO
        buyQueue: [], // array of {quantity, price, originalQuantity} for each buy
      };
    }

    // add this transaction to the list
    assetMap[ticker].transactions.push(tx);

    // calculate quantity and cost
    if (tx.type.toLowerCase() === "buy") {
      assetMap[ticker].totalQuantity += tx.quantity;
      assetMap[ticker].totalCost += tx.quantity * tx.price;
      // add to FIFO queue
      assetMap[ticker].buyQueue.push({
        quantity: tx.quantity,
        price: tx.price,
        originalQuantity: tx.quantity,
      });
    } else {
      // for sells, use FIFO - sell oldest shares first
      let remainingToSell = tx.quantity;
      let costOfSoldShares = 0;

      // go through buy queue in order (oldest first)
      for (let i = 0; i < assetMap[ticker].buyQueue.length && remainingToSell > 0; i++) {
        const buyEntry = assetMap[ticker].buyQueue[i];
        if (buyEntry.quantity <= 0) continue; // skip already exhausted buys

        const sharesFromThisBuy = Math.min(remainingToSell, buyEntry.quantity);
        costOfSoldShares += sharesFromThisBuy * buyEntry.price;
        buyEntry.quantity -= sharesFromThisBuy; // reduce available shares
        remainingToSell -= sharesFromThisBuy;
      }

      assetMap[ticker].totalQuantity -= tx.quantity;
      assetMap[ticker].totalCost -= costOfSoldShares;
    }
  });

  // convert the map to an array and calculate portfolio metrics
  return Object.values(assetMap)
    .filter((asset) => asset.totalQuantity > 0) // only show assets you still own
    .map((asset) => {
      // get current price from prices
      const priceData = prices[asset.ticker] || {
        currentPrice: 0,
        priceChange24h: 0,
        logo: null,
        name: null,
      };

      // prioritize transaction name (from hardcoded list) over API name to avoid "Common Stock" suffix
      // only use API name as fallback if transaction doesn't have a name
      const companyName = asset.name || priceData.name || asset.ticker;

      // calculate average buy price (cost basis per share/coin)
      const avgPrice =
        asset.totalQuantity > 0 ? asset.totalCost / asset.totalQuantity : 0;

      // calculate current market value
      const totalValue = calculateValue(
        asset.totalQuantity,
        priceData.currentPrice
      );

      // calculate profit/loss (unrealized)
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
