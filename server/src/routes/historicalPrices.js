import { Router } from "express";
import { query } from "../config/db.js";

function formatDateToISO(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeAssetType(val) {
  if (!val) return "Stock";
  const n = String(val).trim().toLowerCase();
  if (n === "crypto") return "Crypto";
  if (n === "commodity") return "Commodity";
  return "Stock";
}

const router = Router();

router.post("/fetch", async (req, res) => {
  try {
    const { requests = [] } = req.body;
    if (requests.length === 0) {
      return res.json({});
    }

    const priceMap = {};

    for (const req of requests) {
      const dateStr =
        typeof req.date === "string" ? req.date : formatDateToISO(req.date);
      const result = await query(
        "SELECT price FROM historical_prices WHERE ticker = $1 AND date = $2::date",
        [req.ticker, dateStr]
      );
      if (result.rows.length > 0) {
        const key = `${req.ticker}|${dateStr}`;
        priceMap[key] = parseFloat(result.rows[0].price);
      }
    }
    res.json(priceMap);
  } catch (err) {
    console.error("Failed to fetch historical prices:", err);
    res.status(500).json({ error: "Failed to fetch historical prices" });
  }
});

router.post("/store", async (req, res) => {
  try {
    const prices = req.body.prices || req.body || [];
    if (!Array.isArray(prices) || prices.length === 0) {
      return res.json({ success: true });
    }

    for (const p of prices) {
      const dateStr =
        typeof p.date === "string" ? p.date : formatDateToISO(p.date);
      const assetType = normalizeAssetType(p.assetType || "Stock");
      await query(
        `INSERT INTO historical_prices (ticker, date, price, asset_type)
         VALUES ($1, $2::date, $3, $4)
         ON CONFLICT (ticker, date) DO NOTHING`,
        [p.ticker, dateStr, p.price, assetType]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to store historical prices:", err);
    res.status(500).json({ error: "Failed to store historical prices" });
  }
});

export default router;
