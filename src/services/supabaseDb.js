// Supabase CRUD for portfolio transactions (JWT + RLS on the server).

import { normalizeAssetType, formatTransactionType } from "./utils";
import { getSupabase } from "../lib/supabaseClient";

// user-entered date/time is interpreted in the browser's local timezone,
// stored as UTC (ISO string), and converted back to local time for display
const combineDateAndTime = (date, time) => {
  if (!date) return null;
  if (time) {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
  }
  return date;
};

const parseDatetime = (datetime) => {
  if (!datetime) return { date: "", time: "" };
  try {
    const dateObj = new Date(datetime);
    if (isNaN(dateObj.getTime())) {
      return { date: datetime.split("T")[0] || datetime, time: "" };
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const time = `${hours}:${minutes}`;
    return { date, time };
  } catch {
    return { date: datetime, time: "" };
  }
};

const mapRowToTransaction = (row) => {
  const quantity = parseFloat(row.quantity || 0);
  const priceRaw = row.price;
  const price = priceRaw != null ? parseFloat(priceRaw) : 0;
  const totalCost = parseFloat(row.total_cost || 0);
  const assetType = normalizeAssetType(row.asset_class);
  const { date, time } = parseDatetime(row.occurred_at);
  return {
    id: row.id,
    ticker: row.ticker || "",
    type: row.type || "Buy",
    quantity,
    price,
    date,
    time,
    assetType,
    name: row.name || row.ticker || "",
    totalCost: totalCost || quantity * price,
  };
};

export const fetchTransactions = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];

  // always scope to the signed-in user, even for admins (RLS lets admins
  // read all rows, which would otherwise blend every user's portfolio)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", session.user.id)
    .order("occurred_at", { ascending: false });

  if (error) {
    console.error("supabase fetch error:", error);
    throw new Error(error.message || "failed to fetch transactions");
  }

  return (data || []).map(mapRowToTransaction);
};

export const createTransaction = async (transaction) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const originalPrice = transaction.price;
  const quantity = parseFloat(transaction.quantity);
  const price = parseFloat(originalPrice);
  const totalCost = quantity * price;
  const transactionType = formatTransactionType(transaction.type);
  const assetClass = normalizeAssetType(
    transaction.assetType || transaction.assetClass || "Stock"
  );
  const occurredAt = combineDateAndTime(transaction.date, transaction.time);

  const row = {
    ticker: transaction.ticker,
    name: transaction.name || transaction.ticker,
    type: transactionType,
    quantity,
    price,
    total_cost: totalCost,
    asset_class: assetClass === "Crypto" ? "Crypto" : "Stock",
    occurred_at: occurredAt,
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("supabase create error:", error);
    throw new Error(error.message || "failed to create record");
  }

  const finalPrice =
    originalPrice != null ? parseFloat(originalPrice) : price;

  return {
    ...transaction,
    id: data.id,
    price: finalPrice,
    totalCost,
    assetType:
      transaction.assetType ||
      transaction.assetClass ||
      normalizeAssetType(data.asset_class),
  };
};

export const updateTransaction = async (id, transaction) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const quantity = parseFloat(transaction.quantity);
  const price = parseFloat(transaction.price);
  const totalCost = quantity * price;
  const transactionType = formatTransactionType(transaction.type);
  const assetClass = normalizeAssetType(
    transaction.assetType || transaction.assetClass || "Stock"
  );
  const occurredAt = combineDateAndTime(transaction.date, transaction.time);

  const row = {
    ticker: transaction.ticker,
    name: transaction.name || transaction.ticker,
    type: transactionType,
    quantity,
    price,
    total_cost: totalCost,
    asset_class: assetClass === "Crypto" ? "Crypto" : "Stock",
    occurred_at: occurredAt,
  };

  const { error } = await supabase
    .from("transactions")
    .update(row)
    .eq("id", id);

  if (error) {
    console.error("supabase update error:", error);
    throw new Error(error.message || "failed to update record");
  }

  return {
    ...transaction,
    id,
    totalCost,
    assetType: transaction.assetType || transaction.assetClass,
  };
};

export const deleteTransaction = async (id) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    console.error("supabase delete error:", error);
    throw new Error(error.message || "failed to delete record");
  }
  return true;
};
