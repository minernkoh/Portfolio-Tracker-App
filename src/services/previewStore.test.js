import { beforeEach, describe, expect, it } from "vitest";
import { PREVIEW_TRANSACTIONS, SNAPSHOT_PRICES } from "../data/previewSeed";
import {
  PREVIEW_MODE_KEY,
  PREVIEW_TX_KEY,
  isPreviewEnabled,
  setPreviewEnabled,
  loadTransactions,
  saveTransactions,
  resetTransactions,
  createPreviewTransaction,
  updatePreviewTransaction,
  deletePreviewTransaction,
  deletePreviewTransactions,
  getPreviewPrices,
} from "./previewStore";

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
});

describe("preview mode flag", () => {
  it("is off until enabled", () => {
    expect(isPreviewEnabled()).toBe(false);
    setPreviewEnabled(true);
    expect(isPreviewEnabled()).toBe(true);
    expect(localStorage.getItem(PREVIEW_MODE_KEY)).toBe("1");
    setPreviewEnabled(false);
    expect(isPreviewEnabled()).toBe(false);
  });
});

describe("preview transactions", () => {
  it("seeds from previewSeed on first load and persists", () => {
    const first = loadTransactions();
    expect(first).toHaveLength(PREVIEW_TRANSACTIONS.length);
    expect(first[0].ticker).toBe(PREVIEW_TRANSACTIONS[0].ticker);
    expect(JSON.parse(localStorage.getItem(PREVIEW_TX_KEY))).toHaveLength(
      PREVIEW_TRANSACTIONS.length
    );

    first.pop();
    const second = loadTransactions();
    expect(second).toHaveLength(PREVIEW_TRANSACTIONS.length);
  });

  it("creates, updates, and deletes transactions", () => {
    loadTransactions();

    const created = createPreviewTransaction({
      ticker: "MSFT",
      type: "buy",
      quantity: 4,
      price: 400,
      date: "2026-05-01",
      time: "10:00",
      assetType: "Stock",
      name: "Microsoft Corp.",
    });
    expect(created.id).toBeTruthy();
    expect(created.type).toBe("Buy");
    expect(created.totalCost).toBe(1600);
    expect(loadTransactions().some((tx) => tx.id === created.id)).toBe(true);

    const updated = updatePreviewTransaction(created.id, {
      ...created,
      quantity: 5,
      price: 410,
    });
    expect(updated.quantity).toBe(5);
    expect(updated.totalCost).toBe(2050);
    expect(loadTransactions().find((tx) => tx.id === created.id).quantity).toBe(
      5
    );

    expect(deletePreviewTransaction(created.id)).toBe(true);
    expect(loadTransactions().some((tx) => tx.id === created.id)).toBe(false);
  });

  it("batch-deletes by id", () => {
    const txs = loadTransactions();
    const ids = txs.slice(0, 2).map((tx) => tx.id);
    expect(deletePreviewTransactions(ids)).toBe(2);
    const remaining = loadTransactions();
    expect(remaining).toHaveLength(PREVIEW_TRANSACTIONS.length - 2);
    expect(remaining.some((tx) => ids.includes(tx.id))).toBe(false);
  });

  it("reset restores the seed even after edits", () => {
    loadTransactions();
    saveTransactions([]);
    expect(loadTransactions()).toHaveLength(0);

    const restored = resetTransactions();
    expect(restored).toHaveLength(PREVIEW_TRANSACTIONS.length);
    expect(loadTransactions()[0].id).toBe(PREVIEW_TRANSACTIONS[0].id);
  });
});

describe("getPreviewPrices", () => {
  it("returns snapshot quotes for seed tickers", () => {
    const prices = getPreviewPrices(PREVIEW_TRANSACTIONS);
    expect(prices.AAPL.currentPrice).toBe(SNAPSHOT_PRICES.AAPL.currentPrice);
    expect(prices.BTC.currentPrice).toBe(SNAPSHOT_PRICES.BTC.currentPrice);
  });

  it("falls back to the last transaction price for unknown tickers", () => {
    const prices = getPreviewPrices([
      {
        ticker: "MSFT",
        name: "Microsoft Corp.",
        price: 390,
      },
      {
        ticker: "MSFT",
        name: "Microsoft Corp.",
        price: 415,
      },
    ]);
    expect(prices.MSFT).toEqual({
      currentPrice: 415,
      priceChange24h: 0,
      logo: null,
      name: "Microsoft Corp.",
    });
  });
});
