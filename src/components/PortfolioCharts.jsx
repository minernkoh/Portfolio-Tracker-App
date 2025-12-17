// portfolio performance and allocation charts using Recharts

import React, { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { formatCurrency, calculateValue } from "../services/utils";
import FilterButtons from "./ui/FilterButtons";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];
const TIME_PERIODS = ["7d", "1m", "3m", "ytd", "1y", "all"];

// get cutoff date for time period filtering
const getCutoffDate = (period) => {
  const now = new Date();
  switch (period) {
    case "7d": return new Date(now.setDate(now.getDate() - 7));
    case "1m": return new Date(now.setMonth(now.getMonth() - 1));
    case "3m": return new Date(now.setMonth(now.getMonth() - 3));
    case "ytd": return new Date(now.getFullYear(), 0, 1);
    case "1y": return new Date(now.setFullYear(now.getFullYear() - 1));
    default: return null;
  }
};

// custom tooltip for performance chart
const PerformanceTooltip = ({ active, payload, hideValues }) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-lg shadow-xl">
      <p className="text-[var(--text-secondary)] text-xs mb-1">{payload[0].payload.date}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value, hideValues)}</p>
      {payload[0].payload.costBasis !== undefined && (
        <p className="text-[var(--text-secondary)] text-xs mt-1">
          Cost: {formatCurrency(payload[0].payload.costBasis, hideValues)}
        </p>
      )}
    </div>
  );
};

// process transactions to calculate portfolio history with FIFO
const calculateHistoryData = (transactions, prices, portfolioData, totalValue, timePeriod) => {
  if (!transactions?.length) return [];

  // sort and group transactions by date
  const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const txsByDate = new Map();
  
  sortedTxs.forEach((tx) => {
    const dateKey = new Date(new Date(tx.date).toDateString()).getTime();
    if (!txsByDate.has(dateKey)) txsByDate.set(dateKey, []);
    txsByDate.get(dateKey).push(tx);
  });

  const dataPoints = [];
  const assetMap = {};

  // process each date's transactions
  Array.from(txsByDate.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([dateKey, dateTxs]) => {
      dateTxs.forEach((tx) => {
        if (!assetMap[tx.ticker]) {
          assetMap[tx.ticker] = { quantity: 0, totalCost: 0, buyQueue: [] };
        }

        if (tx.type.toLowerCase() === "buy") {
          assetMap[tx.ticker].quantity += tx.quantity;
          assetMap[tx.ticker].totalCost += tx.quantity * tx.price;
          assetMap[tx.ticker].buyQueue.push({ quantity: tx.quantity, price: tx.price });
        } else {
          // fifo sell
          let remaining = tx.quantity;
          let costSold = 0;
          
          for (const buy of assetMap[tx.ticker].buyQueue) {
            if (remaining <= 0 || buy.quantity <= 0) continue;
            const shares = Math.min(remaining, buy.quantity);
            costSold += shares * buy.price;
            buy.quantity -= shares;
            remaining -= shares;
          }
          
          assetMap[tx.ticker].quantity -= tx.quantity;
          assetMap[tx.ticker].totalCost -= costSold;
        }
      });

      // calculate portfolio value at this date
      let portfolioValue = 0, costBasis = 0;
      Object.entries(assetMap).forEach(([ticker, asset]) => {
        if (asset.quantity > 0) {
          portfolioValue += calculateValue(asset.quantity, prices[ticker]?.currentPrice || 0);
          costBasis += asset.totalCost;
        }
      });

      const date = new Date(dateKey);
      dataPoints.push({
        date: date.toLocaleDateString([], { 
          month: "short", 
          day: "numeric", 
          year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined 
        }),
        value: portfolioValue,
        costBasis,
        timestamp: dateKey,
      });
    });

  // add current point
  if (dataPoints.length > 0) {
    const currentCostBasis = portfolioData.reduce((sum, a) => sum + a.totalCost, 0);
    dataPoints.push({ date: "Now", value: totalValue, costBasis: currentCostBasis, timestamp: Date.now() });
  }

  // filter by time period
  if (timePeriod !== "all") {
    const cutoff = getCutoffDate(timePeriod);
    if (cutoff) return dataPoints.filter((p) => p.timestamp >= cutoff.getTime());
  }

  return dataPoints;
};

export default function PortfolioCharts({ portfolioData, transactions = [], prices = {}, hideValues = false }) {
  const [timePeriod, setTimePeriod] = useState("all");

  const totalValue = portfolioData.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalPnL = portfolioData.reduce((sum, a) => sum + a.pnl, 0);
  const isPositiveTrend = totalPnL >= 0;
  const chartColor = isPositiveTrend ? "#22c55e" : "#ef4444";

  const historyData = useMemo(
    () => calculateHistoryData(transactions, prices, portfolioData, totalValue, timePeriod),
    [transactions, prices, portfolioData, totalValue, timePeriod]
  );

  const allocationData = useMemo(() => {
    const data = portfolioData
      .map((a) => ({ name: a.ticker, value: a.totalValue }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    if (data.length <= 7) return data;
    
    const top7 = data.slice(0, 7);
    const others = data.slice(7).reduce((sum, item) => sum + item.value, 0);
    return [...top7, { name: "Others", value: others }];
  }, [portfolioData]);

  const historicalTrend = historyData.length > 1
    ? historyData[historyData.length - 1].value >= historyData[0].value
    : isPositiveTrend;

  if (portfolioData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="text-lg font-bold text-white mb-2">No portfolio data</h3>
          <p className="text-[var(--text-secondary)]">Add your first transaction to see visual analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Performance Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-sm">Performance</h2>
            {!hideValues && historyData.length > 1 && (
              <span className={`text-sm font-bold ml-2 ${historicalTrend ? "text-green" : "text-red"}`}>
                {historicalTrend ? "▲" : "▼"}{" "}
                {((Math.abs(historyData[historyData.length - 1].value - historyData[0].value) / historyData[0].value) * 100).toFixed(2)}%
              </span>
            )}
          </div>
          <FilterButtons
            options={TIME_PERIODS}
            activeFilter={timePeriod}
            onFilterChange={setTimePeriod}
            labelMap={{ "7d": "7D", "1m": "1M", "3m": "3M", ytd: "YTD", "1y": "1Y", all: "ALL" }}
          />
        </div>

        {historyData.length > 0 ? (
          <div className="h-[260px] w-full relative" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="gradientChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="date" stroke="#52525b"
                  tick={{ fill: "#71717a", fontSize: 10, fontWeight: 500 }}
                  tickLine={false} axisLine={false} dy={10} minTickGap={10} interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: "#71717a", fontSize: 10, fontWeight: 500 }}
                  tickFormatter={(v) => hideValues ? "****" : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  tickLine={false} axisLine={false} orientation="right" domain={["auto", "auto"]}
                />
                <Tooltip content={<PerformanceTooltip hideValues={hideValues} />} cursor={{ stroke: "#52525b", strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#gradientChart)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center">
            <div className="text-sm text-[var(--text-secondary)] mb-2">No transaction history</div>
            <div className="text-xs text-[var(--text-secondary)]">Add transactions to see portfolio performance over time</div>
          </div>
        )}
      </div>

      {/* Allocation Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 flex flex-col" style={{ overflow: 'visible' }}>
        <div className="mb-6">
          <h2 className="text-white font-bold text-sm">Allocation</h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Distribution by Asset Value</p>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ overflow: 'visible' }}>
          {allocationData.length > 0 ? (
            <div className="relative w-full sm:w-[70%] lg:w-[60%] h-[260px] overflow-visible" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <defs>
                    <filter id="glow-pie" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <Pie
                    data={allocationData} cx="50%" cy="50%"
                    innerRadius="55%" outerRadius="80%"
                    paddingAngle={3} dataKey="value" stroke="none"
                    style={{ filter: "url(#glow-pie)" }}
                  >
                    {allocationData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(v) => formatCurrency(v, hideValues)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-[10px] text-[var(--text-secondary)]">Total</div>
                  <div className="text-sm font-bold text-white">{formatCurrency(totalValue, hideValues)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full sm:w-[70%] lg:w-[60%] flex-1 min-h-[260px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm text-[var(--text-secondary)] mb-2">No allocation data</div>
                <div className="text-xs text-[var(--text-secondary)]">Add transactions with positive values to see allocation</div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="w-full sm:w-[30%] lg:w-[40%] flex-1 custom-scrollbar" style={{ overflowY: 'auto', paddingLeft: '18px', paddingRight: '10px' }}>
            <div className="space-y-1.5">
              {allocationData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className="w-3 h-3 flex items-center justify-center flex-shrink-0" style={{ marginLeft: '-4px', marginRight: '4px' }}>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length], boxShadow: `0 0 6px ${CHART_COLORS[i % CHART_COLORS.length]}` }}
                      />
                    </div>
                    <span className="text-[var(--text-secondary)] font-medium text-[11px]" title={entry.name}>{entry.name}</span>
                  </div>
                  <span className="text-white font-bold text-[11px] flex-shrink-0">
                    {hideValues ? "**" : ((entry.value / totalValue) * 100).toFixed(1)}%
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
