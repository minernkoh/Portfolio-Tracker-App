import { useMemo } from "react";
import { calculatePortfolioData } from "../services/utils";

export function usePortfolioStats(transactions, prices) {
  const portfolioData = useMemo(
    () => calculatePortfolioData(transactions, prices),
    [transactions, prices]
  );

  const totalValue = useMemo(
    () => portfolioData.reduce((sum, a) => sum + a.totalValue, 0),
    [portfolioData]
  );

  const totalPnL = useMemo(
    () => portfolioData.reduce((sum, a) => sum + a.pnl, 0),
    [portfolioData]
  );

  const total24hChange = useMemo(
    () =>
      portfolioData.reduce(
        (sum, a) => sum + (a.priceChange24h / 100) * a.currentPrice * a.quantity,
        0
      ),
    [portfolioData]
  );

  const totalCostBasis = useMemo(
    () => portfolioData.reduce((sum, a) => sum + a.totalCost, 0),
    [portfolioData]
  );

  const sortedByPerf = useMemo(
    () =>
      [...portfolioData].sort((a, b) => {
        const pnlPercentA = a.totalCost > 0 ? a.pnl / a.totalCost : 0;
        const pnlPercentB = b.totalCost > 0 ? b.pnl / b.totalCost : 0;
        return pnlPercentB - pnlPercentA;
      }),
    [portfolioData]
  );

  const bestPerformer = sortedByPerf[0] || null;
  const worstPerformer = sortedByPerf[sortedByPerf.length - 1] || null;

  return {
    portfolioData,
    totalValue,
    totalPnL,
    total24hChange,
    totalCostBasis,
    sortedByPerf,
    bestPerformer,
    worstPerformer,
    is24hPositive: total24hChange >= 0,
    isPositive: totalPnL >= 0,
  };
}
