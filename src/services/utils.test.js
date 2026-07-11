import { describe, it, expect } from "vitest";
import {
  calculatePortfolioData,
  formatCurrency,
  formatPrice,
  formatDateToISO,
  transactionSortComparator,
  normalizeAssetType,
} from "./utils";

describe("calculatePortfolioData (FIFO)", () => {
  const prices = {
    AAPL: { currentPrice: 150, priceChange24h: 0, logo: null, name: "Apple Inc." },
  };

  it("should return empty array for no transactions", () => {
    expect(calculatePortfolioData([], {})).toEqual([]);
  });

  it("should calculate single buy correctly", () => {
    const transactions = [
      {
        id: "1",
        ticker: "AAPL",
        type: "Buy",
        quantity: 10,
        price: 100,
        date: "2024-01-15",
        time: "09:30",
        assetType: "Stock",
      },
    ];
    const result = calculatePortfolioData(transactions, prices);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(10);
    expect(result[0].avgPrice).toBe(100);
    expect(result[0].totalCost).toBe(1000);
    expect(result[0].totalValue).toBe(1500);
    expect(result[0].pnl).toBe(500);
  });

  it("should use FIFO for sells - oldest shares sold first", () => {
    const transactions = [
      { id: "1", ticker: "AAPL", type: "Buy", quantity: 10, price: 100, date: "2024-01-01", assetType: "Stock" },
      { id: "2", ticker: "AAPL", type: "Buy", quantity: 5, price: 120, date: "2024-01-15", assetType: "Stock" },
      { id: "3", ticker: "AAPL", type: "Sell", quantity: 8, price: 150, date: "2024-02-01", assetType: "Stock" },
    ];
    const result = calculatePortfolioData(transactions, prices);
    expect(result).toHaveLength(1);
    // Sold 8 from first buy (10 shares @ 100) = 8*100 = 800 cost sold
    // Remaining: 2 from first buy + 5 from second = 7 shares
    // Cost: 2*100 + 5*120 = 200 + 600 = 800
    expect(result[0].quantity).toBe(7);
    expect(result[0].totalCost).toBe(800);
    expect(result[0].avgPrice).toBeCloseTo(800 / 7, 10);
    expect(result[0].totalValue).toBe(7 * 150); // 1050
    expect(result[0].pnl).toBeCloseTo(1050 - 800, 10); // 250
  });

  it("should filter out fully sold positions", () => {
    const transactions = [
      { id: "1", ticker: "AAPL", type: "Buy", quantity: 10, price: 100, date: "2024-01-01", assetType: "Stock" },
      { id: "2", ticker: "AAPL", type: "Sell", quantity: 10, price: 150, date: "2024-02-01", assetType: "Stock" },
    ];
    const result = calculatePortfolioData(transactions, prices);
    expect(result).toHaveLength(0);
  });

  it("should handle buys before sells on same date (FIFO order)", () => {
    const transactions = [
      { id: "1", ticker: "AAPL", type: "Buy", quantity: 5, price: 100, date: "2024-01-15", time: "09:00", assetType: "Stock" },
      { id: "2", ticker: "AAPL", type: "Sell", quantity: 3, price: 110, date: "2024-01-15", time: "14:00", assetType: "Stock" },
    ];
    const result = calculatePortfolioData(transactions, prices);
    expect(result[0].quantity).toBe(2);
    expect(result[0].totalCost).toBe(200); // 2 * 100
  });

  it("should separate stock and crypto assets", () => {
    const transactions = [
      { id: "1", ticker: "AAPL", type: "Buy", quantity: 5, price: 100, date: "2024-01-01", assetType: "Stock" },
      { id: "2", ticker: "BTC", type: "Buy", quantity: 0.5, price: 40000, date: "2024-01-01", assetType: "Crypto" },
    ];
    const priceData = {
      AAPL: { currentPrice: 150, priceChange24h: 0, logo: null, name: "Apple" },
      BTC: { currentPrice: 50000, priceChange24h: 0, logo: null, name: "Bitcoin" },
    };
    const result = calculatePortfolioData(transactions, priceData);
    expect(result).toHaveLength(2);
    const aapl = result.find((r) => r.ticker === "AAPL");
    const btc = result.find((r) => r.ticker === "BTC");
    expect(aapl.assetType).toBe("Stock");
    expect(btc.assetType).toBe("Crypto");
    expect(btc.quantity).toBe(0.5);
  });
});

describe("formatCurrency", () => {
  it("should format numbers as USD", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
    expect(formatCurrency(0.5)).toBe("$0.50");
  });

  it("should hide values when hidden=true", () => {
    expect(formatCurrency(1000, true)).toBe("****");
  });

  it("should handle null/undefined", () => {
    expect(formatCurrency(null)).toBe("$0.00");
    expect(formatCurrency(undefined)).toBe("$0.00");
  });
});

describe("formatPrice", () => {
  it("should format small numbers with scientific notation", () => {
    expect(formatPrice(0.00001234)).toContain("e");
  });

  it("should hide values when hidden=true", () => {
    expect(formatPrice(100, true)).toBe("****");
  });
});

describe("formatDateToISO", () => {
  it("should format date as YYYY-MM-DD", () => {
    const result = formatDateToISO(new Date("2024-03-15T12:00:00Z"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toContain("2024");
    expect(result).toContain("03");
  });
});

describe("normalizeAssetType", () => {
  it("should return Stock for empty or unknown", () => {
    expect(normalizeAssetType()).toBe("Stock");
    expect(normalizeAssetType("")).toBe("Stock");
    expect(normalizeAssetType("stock")).toBe("Stock");
    expect(normalizeAssetType("Other")).toBe("Stock");
  });

  it("should return Crypto for crypto", () => {
    expect(normalizeAssetType("crypto")).toBe("Crypto");
    expect(normalizeAssetType("Crypto")).toBe("Crypto");
  });

  it("should return Commodity for commodity", () => {
    expect(normalizeAssetType("commodity")).toBe("Commodity");
    expect(normalizeAssetType("Commodity")).toBe("Commodity");
  });
});

describe("transactionSortComparator", () => {
  const tx1 = { date: "2024-01-01", time: "09:00", type: "Buy", quantity: 10, price: 100 };
  const tx2 = { date: "2024-01-02", time: "10:00", type: "Sell", quantity: 5, price: 110 };

  it("should sort by date ascending", () => {
    expect(transactionSortComparator(tx1, tx2, "date", "asc")).toBeLessThan(0);
  });

  it("should sort by date descending", () => {
    expect(transactionSortComparator(tx1, tx2, "date", "desc")).toBeGreaterThan(0);
  });

  it("should sort by cost (quantity * price)", () => {
    const cmp = transactionSortComparator(tx1, tx2, "cost", "asc");
    expect(cmp).toBe(1000 - 550); // 10*100 vs 5*110
  });

  it("should sort by quantity", () => {
    expect(transactionSortComparator(tx1, tx2, "quantity", "asc")).toBe(10 - 5);
  });
});
