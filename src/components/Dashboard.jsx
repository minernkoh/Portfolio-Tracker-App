// main dashboard component - displays portfolio, charts, and transaction management

import React, { useState, useCallback, useMemo } from "react";
import Layout from "./Layout";
import PortfolioCharts from "./PortfolioCharts";
import PortfolioTable from "./PortfolioTable";
import TransactionFormModal from "./TransactionFormModal";
import Button from "./ui/Button";
import LoadingState from "./ui/LoadingState";
import ButtonGroup from "./ui/ButtonGroup";
import StatCard from "./ui/StatCard";
import TransactionTypeBadge from "./ui/TransactionTypeBadge";
import IconButton from "./ui/IconButton";
import EmptyState from "./ui/EmptyState";
import {
  formatCurrency,
  formatQuantity,
  calculatePortfolioData,
  formatDateTime,
  calculatePnLPercentage,
  format24hChange,
} from "../services/utils";
import {
  useTransactions,
  usePrices,
  useDeleteAsset,
  useDeleteTransaction,
  useAirtableStatus,
} from "../hooks/usePortfolio";
import { useTransactionModal } from "../hooks/useTransactionModal";
import { EyeIcon, EyeSlashIcon, ArrowClockwiseIcon, CaretUp, CaretDown } from "@phosphor-icons/react";
import { useSort } from "../hooks/useSort";

export default function Dashboard() {
  // data fetching hooks
  const { isEnabled: isAirtableEnabled } = useAirtableStatus();
  const { data: transactions = [], isLoading, error: loadError, refetch } = useTransactions();
  const { prices, isFetching: pricesFetching } = usePrices(transactions);
  const deleteAsset = useDeleteAsset();
  const deleteTransactionMutation = useDeleteTransaction();

  // calculate portfolio data
  const portfolioData = useMemo(() => calculatePortfolioData(transactions, prices), [transactions, prices]);

  // transaction modal hook
  const {
    isFormOpen,
    editingTransaction,
    isEditMode,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    isPending,
  } = useTransactionModal();

  // ui state
  const [hideValues, setHideValues] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterType, setFilterType] = useState("All");
  // sorting hook for transactions table
  const { handleSort: handleTxSort, sortData, getSortDirection: getTxSortDirection } = useSort({ key: "date", direction: "desc" });

  // portfolio calculations - memoized to avoid recalculating on every render
  // total market value of all assets
  const totalValue = useMemo(() => portfolioData.reduce((sum, a) => sum + a.totalValue, 0), [portfolioData]);
  // total profit/loss (unrealized gains/losses)
  const totalPnL = useMemo(() => portfolioData.reduce((sum, a) => sum + a.pnl, 0), [portfolioData]);
  // total 24h change in portfolio value (priceChange24h is a percentage)
  const total24hChange = useMemo(() => {
    return portfolioData.reduce((sum, a) => sum + (a.priceChange24h / 100) * a.currentPrice * a.quantity, 0);
  }, [portfolioData]);

  const is24hPositive = total24hChange >= 0;
  const isPositive = totalPnL >= 0;
  // calculate total cost basis (total amount paid for all assets)
  const totalCostBasis = useMemo(() => portfolioData.reduce((sum, a) => sum + a.totalCost, 0), [portfolioData]);

  // find best/worst performers by percentage return
  // sort by PnL percentage (profit/loss divided by cost basis)
  const sortedByPerf = useMemo(() => {
    return [...portfolioData].sort((a, b) => {
      // calculate percentage return for each asset
      const pnlPercentA = a.totalCost > 0 ? a.pnl / a.totalCost : 0;
      const pnlPercentB = b.totalCost > 0 ? b.pnl / b.totalCost : 0;
      // sort descending (highest return first)
      return pnlPercentB - pnlPercentA;
    });
  }, [portfolioData]);

  const bestPerformer = sortedByPerf[0] || null;
  const worstPerformer = sortedByPerf[sortedByPerf.length - 1] || null;

  // delete asset handler - removes all transactions for a given ticker
  const handleDeleteAsset = useCallback(async (ticker) => {
    if (!window.confirm(`Are you sure you want to remove ${ticker}? This will delete all transactions associated with it.`)) return;
    // find all transactions for this ticker
    const txsToDelete = transactions.filter((tx) => tx.ticker === ticker);
    // delete all transactions in batch
    deleteAsset.mutate({ ticker, transactionIds: txsToDelete.map((tx) => tx.id) });
  }, [transactions, deleteAsset]);

  // delete transaction handler
  const handleDeleteTransaction = useCallback((tx) => {
    if (window.confirm(`Delete this ${tx.type.toLowerCase()} transaction for ${tx.quantity} ${tx.ticker}?`)) {
      deleteTransactionMutation.mutate(tx.id);
    }
  }, [deleteTransactionMutation]);

  // filter and sort transactions based on current filter and sort settings
  const allTransactionsSorted = useMemo(() => {
    // first filter by asset type (All/Stock/Crypto)
    const filtered = transactions.filter((tx) => filterType === "All" || tx.assetType === filterType);
    // then apply sorting with custom comparator
    return sortData(filtered, (a, b, key, direction) => {
      if (key === "date") {
        // combine date and time for accurate chronological sorting
        const dateTimeA = a.time ? `${a.date}T${a.time}` : a.date;
        const dateTimeB = b.time ? `${b.date}T${b.time}` : b.date;
        const dateComparison = new Date(dateTimeA) - new Date(dateTimeB);
        
        // if dates are equal, use secondary sort by transaction type
        // for descending (newest first): Sells before Buys (reverse of FIFO)
        // for ascending (oldest first): Buys before Sells (FIFO order)
        if (dateComparison === 0) {
          const typeA = a.type?.toLowerCase() === 'buy' ? 0 : 1;
          const typeB = b.type?.toLowerCase() === 'buy' ? 0 : 1;
          return direction === 'asc' ? typeA - typeB : typeB - typeA;
        }
        
        return direction === "asc" ? dateComparison : -dateComparison;
      }
      if (key === "cost") {
        // calculate total cost (quantity × price) for comparison
        const valA = a.quantity * a.price;
        const valB = b.quantity * b.price;
        return direction === "asc" ? valA - valB : valB - valA;
      }
      if (["quantity", "price"].includes(key)) {
        // numeric comparison for quantity and price
        return direction === "asc" ? Number(a[key]) - Number(b[key]) : Number(b[key]) - Number(a[key]);
      }
      // string comparison for text fields (ticker, type, etc.)
      const strA = String(a[key]).toLowerCase();
      const strB = String(b[key]).toLowerCase();
      return direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [transactions, filterType, sortData]);


  // filter portfolio data
  const filteredPortfolioData = useMemo(() => {
    if (filterType === "All") return portfolioData;
    return portfolioData.filter((a) => a.assetType === filterType);
  }, [portfolioData, filterType]);

  // loading state
  if (isLoading) return <LoadingState fullScreen={false} />;

  // error state
  if (loadError || (!isAirtableEnabled && transactions.length === 0)) {
    const errorMessage = !isAirtableEnabled
      ? "Airtable configuration missing. Please add your API keys to .env file."
      : loadError?.message || "Failed to load portfolio data. Please try again.";

    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-8 max-w-md w-full">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Failed to Load Data</h2>
            <p className="text-[var(--text-secondary)] mb-6">{errorMessage}</p>
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-2 bg-[var(--accent-blue)] text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors w-full"
            >
              <ArrowClockwiseIcon size={18} weight="bold" />
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-white">My Portfolio</h1>
                <button
                  onClick={() => setHideValues((prev) => !prev)}
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  title={hideValues ? "Show values" : "Hide values"}
                >
                  {hideValues ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                {pricesFetching && (
                  <span className="text-xs text-[var(--text-secondary)] animate-pulse">Updating prices...</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-white">{formatCurrency(totalValue, hideValues)}</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-sm font-bold ${is24hPositive ? "text-green" : "text-red"}`}>
                    {is24hPositive ? "+" : ""}{formatCurrency(total24hChange, hideValues)}
                  </span>
                  {/* calculate 24h change percentage and display with arrow indicator */}
                  {(() => {
                    // calculate percentage change: (change / previous value) × 100
                    const changePercent = !hideValues && totalValue > 0
                      ? (Math.abs(total24hChange) / (totalValue - total24hChange)) * 100
                      : 0;
                    const change24h = format24hChange(changePercent);
                    return (
                      <span className={`text-sm font-bold flex items-center gap-1 ${change24h.isPositive ? "text-green" : "text-red"}`}>
                        {change24h.isPositive ? <CaretUp size={14} weight="fill" /> : <CaretDown size={14} weight="fill" />}
                        <span>{!hideValues ? `${change24h.formatted}%` : "***"} (24h)</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <ButtonGroup
              variant="tabs"
              options={[{ id: "overview", label: "Overview" }, { id: "transactions", label: "Transactions" }]}
              value={activeTab}
              onChange={setActiveTab}
            />
          </div>
          <div className="flex flex-col items-end gap-4">
            <Button icon="plus" onClick={() => openAddModal()} disabled={isPending}>Add Transaction</Button>
          </div>
        </div>

        {/* overview tab */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="All-time profit/loss"
                value={totalPnL}
                valueFormatted={`${isPositive ? "+" : ""}${formatCurrency(totalPnL, hideValues)}`}
                subtitle={
                  <span className="flex items-center gap-1">
                    {isPositive ? <CaretUp size={12} weight="fill" /> : <CaretDown size={12} weight="fill" />}
                    <span>{!hideValues ? Math.abs(parseFloat(calculatePnLPercentage(totalPnL, totalCostBasis))).toFixed(2) : "**"}%</span>
                  </span>
                }
                isPositive={isPositive}
                hideValues={hideValues}
              />
              <StatCard label="Cost basis" value={totalCostBasis} hideValues={hideValues} />
              {bestPerformer ? (
                <StatCard
                  label="Best performer"
                  value={bestPerformer.ticker}
                  valueFormatted={bestPerformer.ticker}
                  subtitle={
                    <span className="flex items-center gap-1">
                      <CaretUp size={12} weight="fill" />
                      <span>+{!hideValues ? calculatePnLPercentage(bestPerformer.pnl, bestPerformer.totalCost) : "**"}%</span>
                    </span>
                  }
                  isPositive={true}
                  hideValues={hideValues}
                />
              ) : (
                <StatCard label="Best performer" value="-" valueFormatted="-" />
              )}
              {worstPerformer ? (
                <StatCard
                  label="Worst performer"
                  value={worstPerformer.ticker}
                  valueFormatted={worstPerformer.ticker}
                  subtitle={
                    <span className="flex items-center gap-1">
                      {worstPerformer.pnl >= 0 ? <CaretUp size={12} weight="fill" /> : <CaretDown size={12} weight="fill" />}
                      {worstPerformer.pnl >= 0 && <span>+</span>}
                      <span>{!hideValues ? Math.abs(parseFloat(calculatePnLPercentage(worstPerformer.pnl, worstPerformer.totalCost))).toFixed(2) : "**"}%</span>
                    </span>
                  }
                  isPositive={worstPerformer.pnl >= 0}
                  hideValues={hideValues}
                />
              ) : (
                <StatCard label="Worst performer" value="-" valueFormatted="-" />
              )}
            </div>

            {/* charts */}
            <PortfolioCharts portfolioData={portfolioData} transactions={transactions} prices={prices} hideValues={hideValues} />

            {/* assets table */}
            <div>
              <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white">Assets</h2>
                <ButtonGroup
                  variant="pills"
                  options={["All", "Stock", "Crypto"]}
                  value={filterType}
                  onChange={setFilterType}
                  labelMap={{ Stock: "Stocks" }}
                />
              </div>
              <PortfolioTable
                data={filteredPortfolioData}
                hideValues={hideValues}
                onDeleteAsset={handleDeleteAsset}
                onAddTransaction={openAddModal}
              />
            </div>
          </div>
        )}

        {/* transactions tab */}
        {activeTab === "transactions" && (
          <div className="animate-slide-up bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer select-none">
                    {[
                      { key: "date", label: "Date" },
                      { key: "type", label: "Type" },
                      { key: "ticker", label: "Asset" },
                      { key: "quantity", label: "Quantity", align: "right" },
                      { key: "price", label: "Price", align: "right" },
                      { key: "cost", label: "Cost", align: "right" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className={`py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white ${col.align === "right" ? "text-right" : ""}`}
                        onClick={() => handleTxSort(col.key)}
                      >
                        <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                          {col.label}
                          {getTxSortDirection(col.key) && (
                            getTxSortDirection(col.key) === 'asc' ? (
                              <CaretUp size={12} weight="fill" className="text-white" />
                            ) : (
                              <CaretDown size={12} weight="fill" className="text-white" />
                            )
                          )}
                        </div>
                    </th>
                    ))}
                    <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {allTransactionsSorted.length === 0 ? (
                    <EmptyState message="No transactions found." colSpan={7} />
                  ) : (
                    allTransactionsSorted.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">{formatDateTime(tx.date, tx.time)}</td>
                        <td className="py-4 px-6"><TransactionTypeBadge type={tx.type} variant="compact" /></td>
                        <td className="py-4 px-6 text-sm font-bold text-white">{tx.ticker}</td>
                        <td className="py-4 px-6 text-sm text-right text-white">{formatQuantity(tx.quantity)}</td>
                        <td className="py-4 px-6 text-sm text-right text-[var(--text-secondary)]">{formatCurrency(tx.price, hideValues)}</td>
                        <td className="py-4 px-6 text-sm text-right font-medium text-white">{formatCurrency(tx.quantity * tx.price, hideValues)}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton variant="edit" onClick={() => openEditModal(tx)} disabled={deleteTransactionMutation.isPending} />
                            <IconButton variant="delete" onClick={() => handleDeleteTransaction(tx)} disabled={deleteTransactionMutation.isPending} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* transaction modal */}
        {isFormOpen && (
          <TransactionFormModal
            isOpen={isFormOpen}
            onClose={closeModal}
            onSubmit={handleSubmit}
            initialData={editingTransaction}
            isEditMode={isEditMode}
            portfolioData={portfolioData}
          />
        )}
      </div>
    </Layout>
  );
}
