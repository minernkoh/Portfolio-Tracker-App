import { useMemo } from "react";
import { transactionSortComparator } from "../services/utils";

export function useTransactionFilters(transactions, portfolioData, filterType, sortData) {
  const allTransactionsSorted = useMemo(() => {
    const filtered = transactions.filter(
      (tx) => filterType === "All" || tx.assetType === filterType
    );
    return sortData(filtered, transactionSortComparator);
  }, [transactions, filterType, sortData]);

  const filteredPortfolioData = useMemo(() => {
    if (filterType === "All") return portfolioData;
    return portfolioData.filter((a) => a.assetType === filterType);
  }, [portfolioData, filterType]);

  return {
    allTransactionsSorted,
    filteredPortfolioData,
  };
}
