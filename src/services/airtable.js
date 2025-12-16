// this file handles all database operations with airtable

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
  DATE: "fldtLF3YmzNZQWmgN", // transaction date
};

// headers needed for all airtable api requests
// authorization tells airtable who we are (using our api key)
// content-type tells airtable we're sending json data
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
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
      const quantity = Number(fields.Quantity || 0);
      const totalCost = Number(fields["Total Cost"] || 0);
      const price = Number(fields.Price || 0);

      // calculate price from total cost if price wasn't provided
      const calculatedPrice =
        price || (quantity > 0 ? totalCost / quantity : 0);

      // handle asset class - remove newlines and normalize
      let assetType = fields["Asset Class"] || "Stock";
      if (typeof assetType === "string") {
        assetType = assetType.trim().replace(/\n/g, ""); // remove newlines
        // normalize to "Stock" or "Crypto"
        if (assetType.toLowerCase() === "crypto") {
          assetType = "Crypto";
        } else {
          assetType = "Stock";
        }
      }

      // return a clean transaction object
      return {
        id: record.id, // unique id from airtable
        ticker: fields.Ticker || "",
        type: fields.Type || "Buy",
        quantity: quantity,
        price: calculatedPrice,
        date: fields.Date || "",
        assetType: assetType,
        name: fields.Name || fields.Ticker || "",
        totalCost: totalCost || quantity * calculatedPrice,
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
  const quantity = Number(transaction.quantity);
  const price = Number(transaction.price);
  const totalCost = quantity * price;

  // ensure type is capitalized (buy/sell -> Buy/Sell)
  const transactionType = transaction.type
    ? transaction.type.charAt(0).toUpperCase() +
      transaction.type.slice(1).toLowerCase()
    : "Buy";

  // normalize asset class - must match exact values in Airtable select field
  // Airtable select fields are case-sensitive and must match existing options
  let assetClass = transaction.assetType || transaction.assetClass || "Stock";
  if (typeof assetClass === "string") {
    assetClass = assetClass.trim();
    // normalize to match Airtable select options exactly
    if (assetClass.toLowerCase() === "crypto") {
      assetClass = "Crypto";
    } else {
      assetClass = "Stock"; // default to Stock
    }
  } else {
    assetClass = "Stock"; // fallback
  }

  // prepare the data in the format airtable expects
  // using field ids instead of field names for stability
  const fields = {
    [FIELD_IDS.TICKER]: transaction.ticker,
    [FIELD_IDS.NAME]: transaction.name || transaction.ticker,
    [FIELD_IDS.TYPE]: transactionType,
    [FIELD_IDS.QUANTITY]: quantity,
    [FIELD_IDS.PRICE]: price,
    [FIELD_IDS.TOTAL_COST]: totalCost,
    [FIELD_IDS.DATE]: transaction.date,
  };

  // ASSET_CLASS field - include if Airtable has "Stock" and "Crypto" as select options
  if (assetClass && assetClass.trim() !== "") {
    fields[FIELD_IDS.ASSET_CLASS] = assetClass;
  }

  try {
    // make a post request to create a new record
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields }), // convert javascript object to json string
    });

    // check if request was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message || "failed to create record";
      console.error("Airtable create error details:", { errorData, fields });
      throw new Error(errorMessage);
    }

    // get the created record data
    const data = await response.json();

    // return the transaction with the new id from airtable
    return {
      ...transaction,
      id: data.id,
      totalCost: totalCost,
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
  const quantity = Number(transaction.quantity);
  const price = Number(transaction.price);
  const totalCost = quantity * price;

  // format transaction type
  const transactionType = transaction.type
    ? transaction.type.charAt(0).toUpperCase() +
      transaction.type.slice(1).toLowerCase()
    : "Buy";

  // normalize asset class - must match exact values in Airtable select field
  let assetClass = transaction.assetType || transaction.assetClass || "Stock";
  if (typeof assetClass === "string") {
    assetClass = assetClass.trim();
    if (assetClass.toLowerCase() === "crypto") {
      assetClass = "Crypto";
    } else {
      assetClass = "Stock";
    }
  } else {
    assetClass = "Stock";
  }

  // prepare the data to update
  // using field ids instead of field names for stability
  const fields = {
    [FIELD_IDS.TICKER]: transaction.ticker,
    [FIELD_IDS.NAME]: transaction.name || transaction.ticker,
    [FIELD_IDS.TYPE]: transactionType,
    [FIELD_IDS.QUANTITY]: quantity,
    [FIELD_IDS.PRICE]: price,
    [FIELD_IDS.TOTAL_COST]: totalCost,
    [FIELD_IDS.DATE]: transaction.date,
  };

  // ASSET_CLASS field - include if Airtable has "Stock" and "Crypto" as select options
  if (assetClass && assetClass.trim() !== "") {
    fields[FIELD_IDS.ASSET_CLASS] = assetClass;
  }

  try {
    // make a patch request to update the record
    // patch is used for partial updates (changing some fields but not all)
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    });

    // check if request was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "failed to update record");
    }

    // return the updated transaction
    return { ...transaction, id, totalCost };
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
