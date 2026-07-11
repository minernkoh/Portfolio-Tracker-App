// API client for PostgreSQL backend - replaces airtable.js
// Uses same interface for drop-in replacement

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// fetch all transactions from backend
export const fetchTransactions = async () => {
  try {
    const response = await fetch(`${API_URL}/api/transactions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("api-client fetch error:", error);
    throw error;
  }
};

// create a new transaction
export const createTransaction = async (transaction) => {
  const response = await fetch(`${API_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to create transaction");
  }
  return response.json();
};

// update an existing transaction
export const updateTransaction = async (id, transaction) => {
  const response = await fetch(`${API_URL}/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to update transaction");
  }
  return response.json();
};

// delete a transaction
export const deleteTransaction = async (id) => {
  const response = await fetch(`${API_URL}/api/transactions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to delete transaction");
  }
  return true;
};

// fetch historical prices - requests format: [{ ticker, date, assetType }, ...]
// returns { "ticker|date": price, ... }
export const fetchHistoricalPrices = async (requests = []) => {
  if (!requests.length) return {};
  try {
    const response = await fetch(`${API_URL}/api/historical-prices/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
    if (!response.ok) {
      console.warn("Failed to fetch historical prices from API");
      return {};
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching historical prices:", error);
    return {};
  }
};

// store historical prices - prices format: [{ ticker, date, price, assetType }, ...]
export const storeHistoricalPrices = async (prices = []) => {
  if (!prices.length) return true;
  try {
    const response = await fetch(`${API_URL}/api/historical-prices/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices }),
    });
    if (!response.ok) {
      console.warn("Failed to store historical prices");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error storing historical prices:", error);
    return false;
  }
};
