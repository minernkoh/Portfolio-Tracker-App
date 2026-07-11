// this file handles all database operations with airtable

import { normalizeAssetType, formatTransactionType, formatDateToISO } from "./utils";
import { GMT8_OFFSET_MS } from "../constants/config";

// get api credentials from environment variables (stored in .env file)
const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
// table id - can be overridden via env var, otherwise uses default
const TABLE_ID = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tblmeRh5qtO0IXt1V";

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
// Table 2 for historical prices
const HISTORICAL_PRICES_TABLE_ID = "tblEwfvNQqJkMYFdp";
const HISTORICAL_PRICES_BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${HISTORICAL_PRICES_TABLE_ID}`;

// field ids - using ids instead of names so it works even if field names change
// this makes the code more stable and prevents errors if someone renames fields in airtable
const FIELD_IDS = {
  TICKER: "fldXkorxjB01Z1T8T", // ticker symbol
  NAME: "fldgN9jZYTpqGrVc8", // asset name
  TYPE: "fldh9jRUPOK57WXca", // buy/sell type
  PRICE: "fldoRxJO8RQ8imRWN", // price per share/coin
  QUANTITY: "fldWytbHnrVNx0j6o", // quantity
  ASSET_CLASS: "fldI3N8n39cxzwetg", // stock or crypto
  TOTAL_COST: "fldsLa3vHeoy9Cu5f", // total cost
  DATE: "fldtLF3YmzNZQWmgN", // transaction date (includes time in ISO format)
};

// helper to combine date and time into ISO datetime string for Airtable
// user input is assumed to be in GMT+8, convert to UTC for storage
const combineDateAndTime = (date, time) => {
  if (!date) return null;
  // if time is provided, combine into ISO datetime string
  if (time) {
    // parse date and time components
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);

    // create a UTC timestamp treating the input values as if they were UTC
    // then subtract 8 hours to convert from "GMT+8 input" to actual UTC
    // example: user enters 09:30 GMT+8 -> stores 01:30 UTC
    const inputAsUtcTimestamp = Date.UTC(
      year,
      month - 1,
      day,
      hours,
      minutes,
      0,
      0
    );
    const actualUtcTimestamp = inputAsUtcTimestamp - GMT8_OFFSET_MS;

    return new Date(actualUtcTimestamp).toISOString();
  }
  // if no time, just return the date
  return date;
};

// helper to parse datetime from Airtable into separate date and time
// airtable returns UTC, convert to GMT+8 for display
const parseDatetime = (datetime) => {
  if (!datetime) return { date: "", time: "" };

  try {
    const dateObj = new Date(datetime);
    if (isNaN(dateObj.getTime())) {
      // invalid date, try to extract date portion
      return { date: datetime.split("T")[0] || datetime, time: "" };
    }

    // convert UTC to GMT+8 by adding 8 hours
    const gmt8Time = new Date(dateObj.getTime() + GMT8_OFFSET_MS);

    // extract date in YYYY-MM-DD format (in GMT+8)
    const year = gmt8Time.getUTCFullYear();
    const month = String(gmt8Time.getUTCMonth() + 1).padStart(2, "0");
    const day = String(gmt8Time.getUTCDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    // extract time in HH:MM format (in GMT+8)
    const hours = String(gmt8Time.getUTCHours()).padStart(2, "0");
    const minutes = String(gmt8Time.getUTCMinutes()).padStart(2, "0");
    const time = `${hours}:${minutes}`;

    return { date, time };
  } catch {
    return { date: datetime, time: "" };
  }
};

// headers needed for all airtable api requests
// authorization identifies the requester (using api key)
// content-type indicates json data is being sent
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// build fields object for Airtable API requests
// consolidates field building logic used in both create and update
const buildAirtableFields = (
  transaction,
  transactionType,
  quantity,
  price,
  totalCost,
  datetime,
  assetClass
) => {
  const fields = {
    [FIELD_IDS.TICKER]: transaction.ticker,
    [FIELD_IDS.NAME]: transaction.name || transaction.ticker,
    [FIELD_IDS.TYPE]: transactionType,
    [FIELD_IDS.QUANTITY]: quantity,
    [FIELD_IDS.PRICE]: price,
    [FIELD_IDS.TOTAL_COST]: totalCost,
    [FIELD_IDS.DATE]: datetime, // combined date and time in ISO format
    [FIELD_IDS.ASSET_CLASS]: assetClass === "Crypto" ? "Crypto" : "Stock",
  };

  return fields;
};

// fetch all transactions from airtable
// this function gets all the buy/sell records stored
export const fetchTransactions = async () => {
  // check if required credentials are present
  if (!API_KEY || !BASE_ID) {
    console.warn("airtable credentials missing");
    return [];
  }

  try {
    // make a request to airtable to get all records
    // sort by date field descending (newest first) so latest transactions appear first
    // using field id instead of field name for stability
    const response = await fetch(
      `${BASE_URL}?sort[0][field]=${FIELD_IDS.DATE}&sort[0][direction]=desc`,
      { headers }
    );

    // check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error("airtable fetch error:", response.status, errorText);
      throw new Error(`failed to fetch from airtable: ${response.status}`);
    }

    // convert response to javascript object
    const data = await response.json();

    // airtable returns records in a specific format
    // converts them to a simpler format the app can use
    // note: airtable api returns field names in responses (like "Ticker", "Price")
    // uses field names to read data since that's what airtable returns
    return data.records.map((record) => {
      const fields = record.fields;

      // extract values using field names (airtable returns field names, not ids)
      // use parseFloat to preserve decimal precision, especially for crypto prices
      const quantity = parseFloat(fields.Quantity || 0);
      // for price, preserve the exact value from Airtable - it might be a string or number
      const priceRaw = fields.Price;
      const price = priceRaw != null ? parseFloat(priceRaw) : 0;
      const totalCost = parseFloat(fields["Total Cost"] || 0);

      // handle asset class - normalize using utility function
      const assetType = normalizeAssetType(fields["Asset Class"]);

      // parse datetime from Airtable into separate date and time
      const { date, time } = parseDatetime(fields.Date);

      // return a clean transaction object
      return {
        id: record.id, // unique id from airtable
        ticker: fields.Ticker || "",
        type: fields["Order Type"] || "Buy",
        quantity: quantity,
        price: price, // use the price from Airtable
        date: date, // date portion (YYYY-MM-DD)
        time: time, // time portion (HH:MM)
        assetType: assetType,
        name: fields.Name || fields.Ticker || "",
        totalCost: totalCost || quantity * price,
      };
    });
  } catch (error) {
    console.error("airtable fetch error:", error);
    return [];
  }
};

// create a new transaction in airtable
// this function saves a new buy/sell record to the database
export const createTransaction = async (transaction) => {
  // check if credentials are present
  if (!API_KEY || !BASE_ID) return null;

  // calculate total cost from quantity * price
  // preserve exact price value to avoid precision loss
  // keep original price as-is (might be string or number) to preserve full precision
  const originalPrice = transaction.price; // preserve original price value (string or number)
  const quantity = parseFloat(transaction.quantity);
  const price = parseFloat(originalPrice); // convert to number only for Airtable
  const totalCost = quantity * price;

  // format transaction type using utility
  const transactionType = formatTransactionType(transaction.type);

  const assetClass = normalizeAssetType(
    transaction.assetType || transaction.assetClass || "Stock"
  );

  // combine date and time into ISO datetime string for Airtable
  const datetime = combineDateAndTime(transaction.date, transaction.time);

  // build fields object for Airtable
  const fields = buildAirtableFields(
    transaction,
    transactionType,
    quantity,
    price,
    totalCost,
    datetime,
    assetClass
  );

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields, typecast: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message || "failed to create record";
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // preserve original price precision (important for crypto with many decimals)
    const finalPrice =
      originalPrice != null ? parseFloat(originalPrice) : price;

    return {
      ...transaction,
      id: data.id,
      price: finalPrice,
      totalCost: totalCost,
      assetType:
        transaction.assetType ||
        transaction.assetClass ||
        normalizeAssetType(data.fields?.["Asset Class"]),
    };
  } catch (error) {
    console.error("airtable create error:", error);
    throw error;
  }
};

// update an existing transaction in airtable
// this function modifies a transaction that already exists
export const updateTransaction = async (id, transaction) => {
  // check if credentials are present
  if (!API_KEY || !BASE_ID) return null;

  // calculate values
  // use parseFloat to preserve decimal precision, especially for crypto
  const quantity = parseFloat(transaction.quantity);
  const price = parseFloat(transaction.price);
  const totalCost = quantity * price;

  // format transaction type using utility
  const transactionType = formatTransactionType(transaction.type);

  const assetClass = normalizeAssetType(
    transaction.assetType || transaction.assetClass || "Stock"
  );

  // combine date and time into ISO datetime string for Airtable
  const datetime = combineDateAndTime(transaction.date, transaction.time);

  // build fields object for Airtable
  const fields = buildAirtableFields(
    transaction,
    transactionType,
    quantity,
    price,
    totalCost,
    datetime,
    assetClass
  );

  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields, typecast: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message || "failed to update record";
      throw new Error(errorMessage);
    }

    return {
      ...transaction,
      id,
      totalCost,
      assetType: transaction.assetType || transaction.assetClass,
    };
  } catch (error) {
    console.error("airtable update error:", error);
    throw error;
  }
};

// delete a transaction from airtable
// this function removes a transaction from the database
export const deleteTransaction = async (id) => {
  // check if credentials are present
  if (!API_KEY || !BASE_ID) return false;

  try {
    // make a delete request to remove the record
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers,
    });

    // check if request was successful
    if (!response.ok) throw new Error("failed to delete record");
    return true;
  } catch (error) {
    console.error("airtable delete error:", error);
    return false;
  }
};

// Historical Prices Table field IDs
// TODO: Update these with actual field IDs from Airtable API docs
// Recommended table structure for Table 2 (tblEwfvNQqJkMYFdp):
// - Ticker (Single line text) - e.g., "AAPL", "BTC"
// - Date (Date field, format: YYYY-MM-DD) - e.g., "2024-01-15"
// - Price (Number, decimal) - e.g., 150.25
// - Asset Class (Single select: "Stock" or "Crypto")
//
// To get field IDs: https://airtable.com/app6BrehmOSMnlJHC/api/docs#javascript/table:table%202:fields
// Replace field names with IDs once available for better stability
const HISTORICAL_PRICE_FIELD_IDS = {
  TICKER: "Ticker", // TODO: Replace with field ID from docs
  DATE: "Date", // TODO: Replace with field ID from docs
  PRICE: "Price", // TODO: Replace with field ID from docs
  ASSET_CLASS: "Asset Class", // TODO: Replace with field ID from docs (optional)
};

// fetch historical prices from Airtable for given tickers and dates
export const fetchHistoricalPrices = async (requests = []) => {
  // requests format: [{ ticker, date, assetType }, ...]
  if (!API_KEY || !BASE_ID || requests.length === 0) return {};

  try {
    const priceMap = {};
    
    // For large numbers of requests, split into batches to avoid URL length limits
    // Airtable API has a limit on formula length, so process in chunks
    const batchSize = 50; // Process 50 requests at a time
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      // Build filter formula to get all matching records
      // Use field names in formula (Airtable formulas use field names, not IDs)
      const filters = batch.map((req) => {
        const dateStr = typeof req.date === 'string' ? req.date : formatDateToISO(req.date);
        return `AND({${HISTORICAL_PRICE_FIELD_IDS.TICKER}} = "${req.ticker}", {${HISTORICAL_PRICE_FIELD_IDS.DATE}} = "${dateStr}")`;
      });
      
      // Airtable OR formula syntax: OR(condition1, condition2, ...)
      const formula = filters.length > 1 ? `OR(${filters.join(',')})` : filters[0];
      
      const response = await fetch(
        `${HISTORICAL_PRICES_BASE_URL}?filterByFormula=${encodeURIComponent(formula)}`,
        { headers }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch historical prices batch ${Math.floor(i / batchSize) + 1} from Airtable`);
        continue; // Continue with next batch
      }

      const data = await response.json();

      // Create a map: "ticker|date" -> price
      data.records?.forEach((record) => {
        const fields = record.fields;
        const ticker = fields[HISTORICAL_PRICE_FIELD_IDS.TICKER];
        const date = fields[HISTORICAL_PRICE_FIELD_IDS.DATE];
        const price = parseFloat(fields[HISTORICAL_PRICE_FIELD_IDS.PRICE] || 0);
        
        if (ticker && date) {
          // Normalize date: Airtable date fields return ISO strings (YYYY-MM-DD) or Date objects
          let dateStr = '';
          if (typeof date === 'string') {
            // Extract just the date part (YYYY-MM-DD) if it includes time
            dateStr = date.split('T')[0];
          } else if (date instanceof Date) {
            dateStr = formatDateToISO(date);
          } else {
            dateStr = formatDateToISO(new Date(date));
          }
          const key = `${ticker}|${dateStr}`;
          priceMap[key] = price;
        }
      });
    }

    return priceMap;
  } catch (error) {
    console.error("Error fetching historical prices:", error);
    return {};
  }
};

// store historical prices in Airtable (batch create)
export const storeHistoricalPrices = async (prices = []) => {
  // prices format: [{ ticker, date, price, assetType }, ...]
  if (!API_KEY || !BASE_ID || prices.length === 0) return false;

  try {
    // Check which prices already exist to avoid duplicates
    const existingPrices = await fetchHistoricalPrices(prices);
    
    // Filter out prices that already exist
    const newPrices = prices.filter((p) => {
      const dateStr = typeof p.date === 'string' ? p.date : formatDateToISO(p.date);
      const key = `${p.ticker}|${dateStr}`;
      return !existingPrices[key];
    });

    if (newPrices.length === 0) {
      console.log("All historical prices already exist in Airtable");
      return true;
    }

    // Airtable allows up to 10 records per request, so batch them
    const batchSize = 10;
    for (let i = 0; i < newPrices.length; i += batchSize) {
      const batch = newPrices.slice(i, i + batchSize);
      const records = batch.map((p) => {
        const dateStr = typeof p.date === 'string' ? p.date : formatDateToISO(p.date);
        return {
          fields: {
            [HISTORICAL_PRICE_FIELD_IDS.TICKER]: p.ticker,
            [HISTORICAL_PRICE_FIELD_IDS.DATE]: dateStr,
            [HISTORICAL_PRICE_FIELD_IDS.PRICE]: p.price,
            [HISTORICAL_PRICE_FIELD_IDS.ASSET_CLASS]: normalizeAssetType(p.assetType || "Stock"),
          },
        };
      });

      const response = await fetch(HISTORICAL_PRICES_BASE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ records, typecast: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to store historical prices batch ${i / batchSize + 1}:`, errorText);
        // Continue with next batch even if one fails
      }
    }

    return true;
  } catch (error) {
    console.error("Error storing historical prices:", error);
    return false;
  }
};
