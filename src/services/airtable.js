// this file handles all database operations with airtable

import { normalizeAssetType, formatTransactionType } from "./utils";

// get api credentials from environment variables (stored in .env file)
const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
// table id - can be overridden via env var, otherwise uses default
const TABLE_ID = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tblmeRh5qtO0IXt1V";

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

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

// gmt+8 timezone offset in milliseconds (8 hours)
const GMT8_OFFSET_MS = 8 * 60 * 60 * 1000;

// helper to combine date and time into ISO datetime string for Airtable
// user input is assumed to be in GMT+8, we convert to UTC for storage
const combineDateAndTime = (date, time) => {
  if (!date) return null;
  // if time is provided, combine into ISO datetime string
  if (time) {
    // parse date and time components
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // create a UTC timestamp treating the input values as if they were UTC
    // then subtract 8 hours to convert from "GMT+8 input" to actual UTC
    // example: user enters 09:30 GMT+8 -> we want to store 01:30 UTC
    const inputAsUtcTimestamp = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
    const actualUtcTimestamp = inputAsUtcTimestamp - GMT8_OFFSET_MS;
    
    return new Date(actualUtcTimestamp).toISOString();
  }
  // if no time, just return the date
  return date;
};

// helper to parse datetime from Airtable into separate date and time
// airtable returns UTC, we convert to GMT+8 for display
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
// authorization tells airtable who we are (using our api key)
// content-type tells airtable we're sending json data
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// helper function to retry Airtable request without ASSET_CLASS field if permission error occurs
const retryWithoutAssetClass = async (url, method, fields, price, transaction) => {
  const fieldsWithoutAssetClass = { ...fields };
  delete fieldsWithoutAssetClass[FIELD_IDS.ASSET_CLASS];
  
  const retryResponse = await fetch(url, {
    method,
    headers,
    body: JSON.stringify({ 
      fields: fieldsWithoutAssetClass,
      typecast: true,
    }),
  });
  
  if (!retryResponse.ok) {
    const retryErrorData = await retryResponse.json().catch(() => ({}));
    const retryErrorMessage = retryErrorData.error?.message || `failed to ${method === "POST" ? "create" : "update"} record`;
    throw new Error(retryErrorMessage);
  }
  
  const retryData = await retryResponse.json();
  const originalPrice = transaction.price;
  const originalPriceNum = originalPrice != null ? parseFloat(originalPrice) : price;
  
  const finalTransaction = {
    ...transaction,
    id: retryData.id || transaction.id,
    price: originalPriceNum,
    time: transaction.time || "", // preserve time field
    assetType: transaction.assetType || transaction.assetClass || normalizeAssetType(retryData.fields?.["Asset Class"]),
    totalCost: transaction.quantity !== undefined 
      ? transaction.quantity * originalPriceNum 
      : (transaction.totalCost || transaction.quantity * originalPriceNum),
  };
  
  return {
    ...finalTransaction,
    _assetClassNotSet: true,
  };
};

// fetch all transactions from airtable
// this function gets all the buy/sell records we've stored
export const fetchTransactions = async () => {
  // check if we have the required credentials
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
    // we need to convert them to a simpler format our app can use
    // note: airtable api returns field names in responses (like "Ticker", "Price")
    // we use field names to read data since that's what airtable returns
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
  // check if we have credentials
  if (!API_KEY || !BASE_ID) return null;

  // calculate total cost from quantity * price
  // preserve exact price value to avoid precision loss
  // keep original price as-is (might be string or number) to preserve full precision
  const originalPrice = transaction.price; // Preserve original price value (string or number)
  const quantity = parseFloat(transaction.quantity);
  const price = parseFloat(originalPrice); // Convert to number only for Airtable
  const totalCost = quantity * price;

  // format transaction type using utility
  const transactionType = formatTransactionType(transaction.type);

  const assetClass = normalizeAssetType(transaction.assetType || transaction.assetClass || "Stock");
  
  // combine date and time into ISO datetime string for Airtable
  const datetime = combineDateAndTime(transaction.date, transaction.time);

  const fields = {
    [FIELD_IDS.TICKER]: transaction.ticker,
    [FIELD_IDS.NAME]: transaction.name || transaction.ticker,
    [FIELD_IDS.TYPE]: transactionType,
    [FIELD_IDS.QUANTITY]: quantity,
    [FIELD_IDS.PRICE]: price,
    [FIELD_IDS.TOTAL_COST]: totalCost,
    [FIELD_IDS.DATE]: datetime, // combined date and time in ISO format
  };

  if (assetClass === "Stock" || assetClass === "Crypto") {
    fields[FIELD_IDS.ASSET_CLASS] = String(assetClass).trim();
  }

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields, typecast: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || "failed to create record";
      
      const isSelectFieldError = errorMessage.includes("Insufficient permissions to create new select option") || 
          errorMessage.includes("invalid value for select") ||
          errorMessage.includes("Invalid enum value") ||
          (errorMessage.includes("Could not parse") && errorMessage.includes("Asset Class"));
      
      if (isSelectFieldError) {
        return retryWithoutAssetClass(BASE_URL, "POST", fields, price, transaction);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const originalPriceNum = originalPrice != null ? parseFloat(originalPrice) : price;
    
    return {
      ...transaction,
      id: data.id,
      price: originalPriceNum,
      totalCost: totalCost,
      assetType: transaction.assetType || transaction.assetClass || normalizeAssetType(data.fields?.["Asset Class"]),
    };
  } catch (error) {
    console.error("airtable create error:", error);
    throw error;
  }
};

// update an existing transaction in airtable
// this function modifies a transaction that already exists
export const updateTransaction = async (id, transaction) => {
  // check if we have credentials
  if (!API_KEY || !BASE_ID) return null;

  // calculate values
  // use parseFloat to preserve decimal precision, especially for crypto
  const quantity = parseFloat(transaction.quantity);
  const price = parseFloat(transaction.price);
  const totalCost = quantity * price;

  // format transaction type using utility
  const transactionType = formatTransactionType(transaction.type);

  const assetClass = normalizeAssetType(transaction.assetType || transaction.assetClass || "Stock");
  
  // combine date and time into ISO datetime string for Airtable
  const datetime = combineDateAndTime(transaction.date, transaction.time);

  const fields = {
    [FIELD_IDS.TICKER]: transaction.ticker,
    [FIELD_IDS.NAME]: transaction.name || transaction.ticker,
    [FIELD_IDS.TYPE]: transactionType,
    [FIELD_IDS.QUANTITY]: quantity,
    [FIELD_IDS.PRICE]: price,
    [FIELD_IDS.TOTAL_COST]: totalCost,
    [FIELD_IDS.DATE]: datetime, // combined date and time in ISO format
  };

  if (assetClass === "Stock" || assetClass === "Crypto") {
    fields[FIELD_IDS.ASSET_CLASS] = assetClass;
  }

  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields, typecast: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || "failed to update record";
      
      const isSelectFieldError = errorMessage.includes("Insufficient permissions to create new select option") || 
          errorMessage.includes("invalid value for select") ||
          errorMessage.includes("Invalid enum value") ||
          (errorMessage.includes("Could not parse") && errorMessage.includes("Asset Class"));
      
      if (isSelectFieldError) {
        return retryWithoutAssetClass(`${BASE_URL}/${id}`, "PATCH", fields, price, { ...transaction, id });
      }
      
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
  // check if we have credentials
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
