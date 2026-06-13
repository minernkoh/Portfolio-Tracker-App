import { describe, it, expect } from "vitest";
import {
  calculatePortfolioData,
  validateSellQuantities,
  sortTransactionsChronologically,
  normalizeAssetType,
  calculatePnLPercentage,
} from "./utils";

// helper: build a transaction with sensible defaults
const tx = (overrides) => ({
  ticker: "AAPL",
  type: "Buy",
  quantity: 1,
  price: 100,
  date: "2024-01-01",
  time: "10:00",
  assetType: "Stock",
  name: "Apple",
  ...overrides,
});

describe("calculatePortfolioData (FIFO)", () => {
  it("computes holdings and cost basis for buys only", () => {
    const txs = [
      tx({ quantity: 10, price: 100, date: "2024-01-01" }),
      tx({ quantity: 5, price: 120, date: "2024-01-02" }),
    ];
    const [asset] = calculatePortfolioData(txs, {
      AAPL: { currentPrice: 130 },
    });
    expect(asset.quantity).toBe(15);
    expect(asset.totalCost).toBe(10 * 100 + 5 * 120); // 1600
    expect(asset.avgPrice).toBeCloseTo(1600 / 15);
    expect(asset.totalValue).toBe(15 * 130);
    expect(asset.pnl).toBeCloseTo(15 * 130 - 1600);
  });

  it("removes cost basis of the oldest shares first on a sell", () => {
    // buy 10 @ $100, buy 5 @ $120, sell 8 -> 8 shares leave from the $100 lot
    const txs = [
      tx({ quantity: 10, price: 100, date: "2024-01-01" }),
      tx({ quantity: 5, price: 120, date: "2024-01-02" }),
      tx({ type: "Sell", quantity: 8, price: 150, date: "2024-01-03" }),
    ];
    const [asset] = calculatePortfolioData(txs, {
      AAPL: { currentPrice: 150 },
    });
    expect(asset.quantity).toBe(7);
    // remaining cost basis: 2 shares @ $100 + 5 @ $120 = 200 + 600 = 800
    expect(asset.totalCost).toBeCloseTo(800);
    expect(asset.avgPrice).toBeCloseTo(800 / 7);
  });

  it("excludes fully-sold assets from the result", () => {
    const txs = [
      tx({ quantity: 10, price: 100, date: "2024-01-01" }),
      tx({ type: "Sell", quantity: 10, price: 150, date: "2024-01-02" }),
    ];
    expect(calculatePortfolioData(txs, {})).toHaveLength(0);
  });

  it("orders buys before sells when timestamps are equal", () => {
    // a sell recorded with the same date/time as its covering buy must still
    // process the buy first, otherwise FIFO would oversell
    const txs = [
      tx({ type: "Sell", quantity: 4, price: 150, date: "2024-01-01", time: "10:00" }),
      tx({ type: "Buy", quantity: 10, price: 100, date: "2024-01-01", time: "10:00" }),
    ];
    const [asset] = calculatePortfolioData(txs, {
      AAPL: { currentPrice: 100 },
    });
    expect(asset.quantity).toBe(6);
    expect(asset.totalCost).toBeCloseTo(600); // 6 remaining @ $100
  });

  it("falls back to zero price when the ticker is missing from prices", () => {
    const txs = [tx({ quantity: 3, price: 100 })];
    const [asset] = calculatePortfolioData(txs, {});
    expect(asset.currentPrice).toBe(0);
    expect(asset.totalValue).toBe(0);
    expect(asset.pnl).toBeCloseTo(-300);
  });
});

describe("validateSellQuantities", () => {
  it("passes when every sell is covered by prior buys", () => {
    const txs = [
      tx({ quantity: 10, date: "2024-01-01" }),
      tx({ type: "Sell", quantity: 8, date: "2024-01-02" }),
    ];
    expect(validateSellQuantities(txs)).toEqual({ valid: true });
  });

  it("fails when a sell exceeds holdings at that moment", () => {
    const txs = [
      tx({ quantity: 5, date: "2024-01-01" }),
      tx({ type: "Sell", quantity: 8, date: "2024-01-02" }),
    ];
    expect(validateSellQuantities(txs)).toEqual({ valid: false, ticker: "AAPL" });
  });

  it("catches an intermediate oversell even if the final balance is non-negative", () => {
    // net ends at +2, but the middle sell of 8 is uncovered (only 5 held then)
    const txs = [
      tx({ quantity: 5, date: "2024-01-01" }),
      tx({ type: "Sell", quantity: 8, date: "2024-01-02" }),
      tx({ quantity: 5, date: "2024-01-03" }),
    ];
    expect(validateSellQuantities(txs).valid).toBe(false);
  });

  it("scopes validation to a single ticker when requested", () => {
    const txs = [
      tx({ ticker: "AAPL", quantity: 5, date: "2024-01-01" }),
      tx({ ticker: "MSFT", type: "Sell", quantity: 8, date: "2024-01-02" }),
    ];
    // MSFT is invalid, but scoping to AAPL ignores it
    expect(validateSellQuantities(txs, "AAPL")).toEqual({ valid: true });
  });
});

describe("sortTransactionsChronologically", () => {
  it("does not mutate the input array", () => {
    const txs = [
      tx({ date: "2024-02-01" }),
      tx({ date: "2024-01-01" }),
    ];
    const snapshot = [...txs];
    sortTransactionsChronologically(txs);
    expect(txs).toEqual(snapshot);
  });
});

describe("normalizeAssetType", () => {
  it.each([
    ["crypto", "Crypto"],
    ["  Crypto\n", "Crypto"],
    ["stock", "Stock"],
    ["", "Stock"],
    [null, "Stock"],
    [undefined, "Stock"],
  ])("normalizes %o to %s", (input, expected) => {
    expect(normalizeAssetType(input)).toBe(expected);
  });
});

describe("calculatePnLPercentage", () => {
  it("returns a percentage string", () => {
    expect(calculatePnLPercentage(250, 1000)).toBe("25.00");
  });
  it("guards against a zero or negative cost basis", () => {
    expect(calculatePnLPercentage(250, 0)).toBe("0.00");
    expect(calculatePnLPercentage(250, -5)).toBe("0.00");
  });
});
