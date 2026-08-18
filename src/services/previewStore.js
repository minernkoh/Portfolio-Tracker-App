import { PREVIEW_TRANSACTIONS, SNAPSHOT_PRICES } from "../data/previewSeed";
import { formatTransactionType, normalizeAssetType } from "./utils";

export const PREVIEW_MODE_KEY = "pt-preview-mode";
export const PREVIEW_TX_KEY = "pt-preview-transactions";

function getStorage() {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      return globalThis.localStorage;
    }
  } catch {
    // private browsing / unavailable storage
  }
  return null;
}

function cloneSeed() {
  return JSON.parse(JSON.stringify(PREVIEW_TRANSACTIONS));
}

export function isPreviewEnabled() {
  return getStorage()?.getItem(PREVIEW_MODE_KEY) === "1";
}

export function setPreviewEnabled(enabled) {
  const storage = getStorage();
  if (!storage) return;
  if (enabled) {
    storage.setItem(PREVIEW_MODE_KEY, "1");
  } else {
    storage.removeItem(PREVIEW_MODE_KEY);
  }
}

export function saveTransactions(txs) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PREVIEW_TX_KEY, JSON.stringify(txs));
}

export function loadTransactions() {
  const storage = getStorage();
  const raw = storage?.getItem(PREVIEW_TX_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to seed
    }
  }
  const seeded = cloneSeed();
  saveTransactions(seeded);
  return seeded;
}

export function resetTransactions() {
  const seeded = cloneSeed();
  saveTransactions(seeded);
  return seeded;
}

function nextId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `preview-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toClientTransaction(input, id) {
  const quantity = parseFloat(input.quantity);
  const price = parseFloat(input.price);
  const totalCost = quantity * price;
  return {
    id,
    ticker: input.ticker || "",
    type: formatTransactionType(input.type),
    quantity,
    price,
    date: input.date || "",
    time: input.time || "",
    assetType: normalizeAssetType(input.assetType || input.assetClass),
    name: input.name || input.ticker || "",
    totalCost,
  };
}

export function createPreviewTransaction(transaction) {
  const txs = loadTransactions();
  const created = toClientTransaction(transaction, nextId());
  txs.push(created);
  saveTransactions(txs);
  return created;
}

export function updatePreviewTransaction(id, transaction) {
  const txs = loadTransactions();
  const updated = toClientTransaction(transaction, id);
  const next = txs.map((tx) => (tx.id === id ? { ...tx, ...updated, id } : tx));
  saveTransactions(next);
  return updated;
}

export function deletePreviewTransaction(id) {
  const txs = loadTransactions();
  saveTransactions(txs.filter((tx) => tx.id !== id));
  return true;
}

export function deletePreviewTransactions(ids) {
  if (!ids?.length) return 0;
  const remove = new Set(ids);
  const txs = loadTransactions();
  saveTransactions(txs.filter((tx) => !remove.has(tx.id)));
  return ids.length;
}

/** Snapshot prices plus a synthetic quote for any ticker the user added. */
export function getPreviewPrices(transactions = []) {
  const prices = { ...SNAPSHOT_PRICES };

  for (const tx of transactions) {
    const ticker = tx.ticker?.toUpperCase();
    if (!ticker || SNAPSHOT_PRICES[ticker]) continue;
    // last transaction in the list wins for tickers without a snapshot
    prices[ticker] = {
      currentPrice: Number(tx.price) || 0,
      priceChange24h: 0,
      logo: null,
      name: tx.name || ticker,
    };
  }

  return prices;
}
