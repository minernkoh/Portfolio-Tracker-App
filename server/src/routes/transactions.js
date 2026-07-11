import { Router } from "express";
import { query } from "../config/db.js";

const GMT8_OFFSET_MS = 8 * 60 * 60 * 1000;

function combineDateAndTime(date, time) {
  if (!date) return null;
  if (time) {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
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
    return new Date(actualUtcTimestamp);
  }
  return new Date(date + "T00:00:00Z");
}

function parseDatetime(datetime) {
  if (!datetime) return { date: "", time: "" };
  try {
    const dateObj = new Date(datetime);
    if (isNaN(dateObj.getTime())) {
      const datePart = datetime.split("T")[0] || datetime;
      return { date: datePart, time: "" };
    }
    const gmt8Time = new Date(dateObj.getTime() + GMT8_OFFSET_MS);
    const year = gmt8Time.getUTCFullYear();
    const month = String(gmt8Time.getUTCMonth() + 1).padStart(2, "0");
    const day = String(gmt8Time.getUTCDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;
    const hours = String(gmt8Time.getUTCHours()).padStart(2, "0");
    const minutes = String(gmt8Time.getUTCMinutes()).padStart(2, "0");
    const time = `${hours}:${minutes}`;
    return { date, time };
  } catch {
    return { date: datetime, time: "" };
  }
}

function normalizeAssetType(val) {
  if (!val) return "Stock";
  const n = String(val).trim().toLowerCase();
  if (n === "crypto") return "Crypto";
  if (n === "commodity") return "Commodity";
  return "Stock";
}

function formatTransactionType(type) {
  if (!type) return "Buy";
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function rowToTransaction(row) {
  const { date, time } = parseDatetime(row.date);
  const quantity = parseFloat(row.quantity);
  const price = parseFloat(row.price);
  const totalCost = parseFloat(row.total_cost) || quantity * price;
  return {
    id: String(row.id),
    ticker: row.ticker || "",
    name: row.name || row.ticker || "",
    type: row.type || "Buy",
    quantity,
    price,
    date,
    time,
    assetType: normalizeAssetType(row.asset_type),
    totalCost,
  };
}

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT id, ticker, name, type, quantity, price, date,
        quantity * price as total_cost, asset_type
       FROM transactions
       ORDER BY date DESC`
    );
    const transactions = result.rows.map(rowToTransaction);
    res.json(transactions);
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tx = req.body;
    const quantity = parseFloat(tx.quantity);
    const price = parseFloat(tx.price);
    const totalCost = quantity * price;
    const transactionType = formatTransactionType(tx.type);
    const assetType = normalizeAssetType(tx.assetType || tx.assetClass || "Stock");
    const dateValue = combineDateAndTime(tx.date, tx.time);

    const result = await query(
      `INSERT INTO transactions (ticker, name, type, quantity, price, date, asset_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, ticker, name, type, quantity, price, date, asset_type`,
      [
        tx.ticker,
        tx.name || tx.ticker,
        transactionType,
        quantity,
        price,
        dateValue,
        assetType,
      ]
    );
    const row = result.rows[0];
    const created = rowToTransaction({
      ...row,
      total_cost: totalCost,
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("Failed to create transaction:", err);
    res.status(500).json({ error: err.message || "Failed to create transaction" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const tx = req.body;
    const quantity = parseFloat(tx.quantity);
    const price = parseFloat(tx.price);
    const totalCost = quantity * price;
    const transactionType = formatTransactionType(tx.type);
    const assetType = normalizeAssetType(tx.assetType || tx.assetClass || "Stock");
    const dateValue = combineDateAndTime(tx.date, tx.time);

    await query(
      `UPDATE transactions
       SET ticker=$1, name=$2, type=$3, quantity=$4, price=$5, date=$6, asset_type=$7, updated_at=NOW()
       WHERE id=$8`,
      [
        tx.ticker,
        tx.name || tx.ticker,
        transactionType,
        quantity,
        price,
        dateValue,
        assetType,
        id,
      ]
    );
    res.json({
      ...tx,
      id,
      totalCost,
      assetType: tx.assetType || tx.assetClass || assetType,
    });
  } catch (err) {
    console.error("Failed to update transaction:", err);
    res.status(500).json({ error: err.message || "Failed to update transaction" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await query("DELETE FROM transactions WHERE id=$1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete transaction:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

export default router;
