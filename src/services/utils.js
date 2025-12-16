// this file contains helper functions used throughout the app
// these are utility functions that format numbers and calculate values

// format a number as US dollars (money format) example: formatCurrency(1000) returns "$1,000.00"
export const formatCurrency = (value, hidden = false) => {
  // privacy feature, for hiding numbers
  if (hidden) return "****";

  // use javascript's built-in number formatter for US dollars
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2, // always show 2 decimal places
    maximumFractionDigits: 2, // never show more than 2 decimal places
  }).format(value);
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

// format a date string to show date and time nicely (removes T and Z)
// example: formatDateTime("2024-01-15T14:30:00Z") returns "2024-01-15 14:30"
export const formatDateTime = (dateString) => {
  if (!dateString) return "";
  
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
        assetType: tx.assetType || "Stock",
        transactions: [],
        totalQuantity: 0,
        totalCost: 0,
      };
    }

    // add this transaction to the list
    assetMap[ticker].transactions.push(tx);

    // calculate quantity and cost
    if (tx.type.toLowerCase() === "buy") {
      assetMap[ticker].totalQuantity += tx.quantity;
      assetMap[ticker].totalCost += tx.quantity * tx.price;
    } else {
      // for sells, use FIFO - sell oldest shares first
      let remainingToSell = tx.quantity;
      let costOfSoldShares = 0;

      // go through buy transactions in order
      for (const buyTx of assetMap[ticker].transactions.filter(
        (t) => t.type.toLowerCase() === "buy"
      )) {
        if (remainingToSell <= 0) break;

        const sharesFromThisBuy = Math.min(remainingToSell, buyTx.quantity);
        costOfSoldShares += sharesFromThisBuy * buyTx.price;
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
      };

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
        name: asset.name,
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
