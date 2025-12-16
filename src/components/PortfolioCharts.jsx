// this component displays charts showing portfolio performance and allocation
// it uses recharts library to create visual graphs

import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatCurrency, calculateValue } from "../services/utils";

// colors for the pie chart slices
const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
];

// custom tooltip for performance chart
const PerformanceTooltip = ({ active, payload, hideValues = false }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-lg shadow-xl">
        <p className="text-[var(--text-secondary)] text-xs mb-1">
          {payload[0].payload.date}
        </p>
        <p className="text-white font-bold">
          {formatCurrency(payload[0].value, hideValues)}
        </p>
        {payload[0].payload.costBasis !== undefined && (
          <p className="text-[var(--text-secondary)] text-xs mt-1">
            Cost: {formatCurrency(payload[0].payload.costBasis, hideValues)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function PortfolioCharts({
  portfolioData,
  transactions = [],
  prices = {},
  hideValues = false,
}) {
  // time period state
  const [timePeriod, setTimePeriod] = useState("all");

  // calculate total portfolio value
  const totalValue = portfolioData.reduce(
    (acc, curr) => acc + curr.totalValue,
    0
  );

  // calculate portfolio value over time based on transaction dates
  const historyData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

    // calculate portfolio value at each transaction date
    const dataPoints = [];
    const assetMap = {}; // track holdings over time

    sortedTransactions.forEach((tx) => {
      const ticker = tx.ticker;

      // initialize asset if not seen before
      if (!assetMap[ticker]) {
        assetMap[ticker] = {
          quantity: 0,
          totalCost: 0,
          transactions: [],
        };
      }

      // update holdings based on transaction
      if (tx.type.toLowerCase() === "buy") {
        assetMap[ticker].quantity += tx.quantity;
        assetMap[ticker].totalCost += tx.quantity * tx.price;
      } else {
        // FIFO sell calculation
        let remainingToSell = tx.quantity;
        let costOfSoldShares = 0;
        for (const buyTx of assetMap[ticker].transactions.filter(
          (t) => t.type.toLowerCase() === "buy"
        )) {
          if (remainingToSell <= 0) break;
          const sharesFromThisBuy = Math.min(remainingToSell, buyTx.quantity);
          costOfSoldShares += sharesFromThisBuy * buyTx.price;
          remainingToSell -= sharesFromThisBuy;
        }
        assetMap[ticker].quantity -= tx.quantity;
        assetMap[ticker].totalCost -= costOfSoldShares;
      }

      assetMap[ticker].transactions.push(tx);

      // calculate portfolio value at this point using current prices
      let portfolioValue = 0;
      let totalCostBasis = 0;

      Object.keys(assetMap).forEach((assetTicker) => {
        const asset = assetMap[assetTicker];
        if (asset.quantity > 0) {
          // use current price if available, otherwise use 0
          const currentPrice = prices[assetTicker]?.currentPrice || 0;
          portfolioValue += calculateValue(asset.quantity, currentPrice);
          totalCostBasis += asset.totalCost;
        }
      });

      // format date for display
      const date = new Date(tx.date);
      const dateLabel = date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
      });

      dataPoints.push({
        date: dateLabel,
        value: portfolioValue,
        costBasis: totalCostBasis,
        timestamp: date.getTime(),
      });
    });

    // add current point if we have transactions
    if (dataPoints.length > 0) {
      const currentCostBasis = portfolioData.reduce(
        (sum, asset) => sum + asset.totalCost,
        0
      );
      dataPoints.push({
        date: "Now",
        value: totalValue,
        costBasis: currentCostBasis,
        timestamp: Date.now(),
      });
    }

    // filter by time period if not 'all'
    if (timePeriod !== "all") {
      const now = new Date();
      let cutoffDate = null;

      switch (timePeriod) {
        case "7d":
          cutoffDate = new Date(now);
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case "1m":
          cutoffDate = new Date(now);
          cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          break;
        case "3m":
          cutoffDate = new Date(now);
          cutoffDate.setMonth(cutoffDate.getMonth() - 3);
          break;
        case "ytd":
          cutoffDate = new Date(now.getFullYear(), 0, 1);
          break;
        case "1y":
          cutoffDate = new Date(now);
          cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
          break;
        default:
          break;
      }

      if (cutoffDate) {
        const rangeTimestamp = cutoffDate.getTime();
        return dataPoints.filter((point) => point.timestamp >= rangeTimestamp);
      }
    }

    return dataPoints;
  }, [transactions, prices, portfolioData, totalValue, timePeriod]);

  // prepare data for allocation pie chart
  const allocationData = useMemo(() => {
    // create array of assets with their values
    const data = portfolioData
      .map((asset) => ({
        name: asset.ticker,
        value: asset.totalValue,
      }))
      .filter((item) => item.value > 0) // only include assets with value
      .sort((a, b) => b.value - a.value); // sort by value descending

    // if more than 7 assets, group the rest as "others"
    if (data.length <= 7) return data;

    const top7 = data.slice(0, 7);
    const others = data.slice(7).reduce((sum, item) => sum + item.value, 0);

    return [...top7, { name: "Others", value: others }];
  }, [portfolioData]);

  // calculate total profit/loss to determine trend color
  const totalPnL = portfolioData.reduce((sum, asset) => sum + asset.pnl, 0);
  const isPositiveTrend = totalPnL >= 0;
  const chartColor = isPositiveTrend ? "#22c55e" : "#ef4444";

  // determine trend from history data
  const historicalTrend =
    historyData.length > 1
      ? historyData[historyData.length - 1].value >= historyData[0].value
      : isPositiveTrend;

  // show empty state if no portfolio data
  if (portfolioData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="text-lg font-bold text-white mb-2">
            No portfolio data
          </h3>
          <p className="text-[var(--text-secondary)]">
            Add your first transaction to see visual analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* performance chart based on transaction history */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-sm">Performance</h2>
            {/* show trend indicator */}
            {!hideValues && historyData.length > 1 && (
              <span
                className={`text-sm font-bold ml-2 ${
                  historicalTrend ? "text-green" : "text-red"
                }`}
              >
                {historicalTrend ? "▲" : "▼"}{" "}
                {(
                  (Math.abs(
                    historyData[historyData.length - 1].value -
                      historyData[0].value
                  ) /
                    historyData[0].value) *
                  100
                ).toFixed(2)}
                %
              </span>
            )}
          </div>
          {/* time period tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-app)] p-1 rounded-lg border border-[var(--border-subtle)]">
            {["7d", "1m", "3m", "ytd", "1y", "all"].map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  timePeriod === period
                    ? "bg-[var(--border-highlight)] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* area chart showing portfolio value over time */}
        {historyData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient
                    id="gradientChart"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={chartColor}
                      stopOpacity={0.1}
                    />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#52525b"
                  tick={{ fill: "#71717a", fontSize: 10, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  minTickGap={30}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: "#71717a", fontSize: 10, fontWeight: 500 }}
                  tickFormatter={(value) =>
                    hideValues
                      ? "****"
                      : value >= 1000
                      ? (value / 1000).toFixed(1) + "k"
                      : value
                  }
                  tickLine={false}
                  axisLine={false}
                  orientation="right"
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={<PerformanceTooltip hideValues={hideValues} />}
                  cursor={{ stroke: "#52525b", strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#gradientChart)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-[var(--text-secondary)] mb-2">
                No transaction history
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                Add transactions to see portfolio performance over time
              </div>
            </div>
          </div>
        )}
      </div>

      {/* allocation chart (pie chart showing asset distribution) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 flex flex-col">
        <div className="mb-6">
          <h2 className="text-white font-bold text-sm">Allocation</h2>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Distribution by Asset Value
          </p>
        </div>

        <div className="flex-1 flex flex-row items-center justify-between gap-2 min-h-[180px]">
          {/* pie chart */}
          <div className="relative w-[50%] h-[180px] overflow-visible">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {/* glow effect for pie slices */}
                  <filter
                    id="glow-pie"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  style={{ filter: "url(#glow-pie)" }}
                >
                  {allocationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="rgba(0,0,0,0)"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value) => formatCurrency(value, hideValues)}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* center label showing total value */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-secondary)]">
                  total
                </div>
                <div className="text-sm font-bold text-white">
                  {formatCurrency(totalValue, hideValues)}
                </div>
              </div>
            </div>
          </div>

          {/* legend showing each asset and its percentage */}
          <div className="w-[50%] overflow-y-auto max-h-[180px] custom-scrollbar pl-2.5">
            <div className="space-y-1.5">
              {allocationData.map((entry, index) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div
                      className="min-w-[8px] h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                        boxShadow: `0 0 8px ${COLORS[index % COLORS.length]}`,
                      }}
                    ></div>
                    <span className="text-[var(--text-secondary)] truncate font-medium text-[11px]">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-white font-bold text-[11px] ml-1">
                    {hideValues
                      ? "**"
                      : ((entry.value / totalValue) * 100).toFixed(1)}
                    %
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
