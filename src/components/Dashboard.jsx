// main dashboard component - displays portfolio, charts, and transaction management

import React, { useState, useCallback, useMemo } from "react";
import Layout from "./Layout";
import PortfolioCharts from "./PortfolioCharts";
import PortfolioTable from "./PortfolioTable";
import TransactionFormModal from "./TransactionFormModal";
import AddTransactionButton from "./ui/AddTransactionButton";
import LoadingState from "./ui/LoadingState";
import TabSwitcher from "./ui/TabSwitcher";
import StatCard from "./ui/StatCard";
import FilterButtons from "./ui/FilterButtons";
import TransactionTypeBadge from "./ui/TransactionTypeBadge";
import EditButton from "./ui/EditButton";
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
  useAirtableStatus,
} from "../hooks/usePortfolio";
import { useTransactionModal } from "../hooks/useTransactionModal";
import { EyeIcon, EyeSlashIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { useSort } from "../hooks/useSort";

export default function Dashboard() {
  // data fetching hooks
  const { isEnabled: isAirtableEnabled } = useAirtableStatus();
  const { data: transactions = [], isLoading, error: loadError, refetch } = useTransactions();
  const { prices, isFetching: pricesFetching } = usePrices(transactions);
  const deleteAsset = useDeleteAsset();

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
  } = useTransactionModal(portfolioData);

  // ui state
  const [hideValues, setHideValues] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterType, setFilterType] = useState("All");
  const { sortConfig: txSortConfig, handleSort: handleTxSort, sortData } = useSort({ key: "date", direction: "desc" });

  // portfolio calculations
  const totalValue = useMemo(() => portfolioData.reduce((sum, a) => sum + a.totalValue, 0), [portfolioData]);
  const totalPnL = useMemo(() => portfolioData.reduce((sum, a) => sum + a.pnl, 0), [portfolioData]);
  const total24hChange = useMemo(() => {
    return portfolioData.reduce((sum, a) => sum + (a.priceChange24h / 100) * a.currentPrice * a.quantity, 0);
  }, [portfolioData]);

  const is24hPositive = total24hChange >= 0;
  const isPositive = totalPnL >= 0;
  const totalCostBasis = portfolioData.reduce((sum, a) => sum + a.totalCost, 0);

  // find best/worst performers
  const sortedByPerf = useMemo(() => {
    return [...portfolioData].sort((a, b) => {
      const pnlPercentA = a.totalCost > 0 ? a.pnl / a.totalCost : 0;
      const pnlPercentB = b.totalCost > 0 ? b.pnl / b.totalCost : 0;
      return pnlPercentB - pnlPercentA;
    });
  }, [portfolioData]);

  const bestPerformer = sortedByPerf[0] || null;
  const worstPerformer = sortedByPerf[sortedByPerf.length - 1] || null;

  // delete asset handler
  const handleDeleteAsset = useCallback(async (ticker) => {
    if (!window.confirm(`Are you sure you want to remove ${ticker}? This will delete all transactions associated with it.`)) return;
    const txsToDelete = transactions.filter((tx) => tx.ticker === ticker);
    deleteAsset.mutate({ ticker, transactionIds: txsToDelete.map((tx) => tx.id) });
  }, [transactions, deleteAsset]);

  // filter and sort transactions
  const allTransactionsSorted = useMemo(() => {
    const filtered = transactions.filter((tx) => filterType === "All" || tx.assetType === filterType);
    return sortData(filtered, (a, b, key, direction) => {
      if (key === "date") {
        return direction === "asc" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
      }
      if (key === "cost") {
        const valA = a.quantity * a.price;
        const valB = b.quantity * b.price;
        return direction === "asc" ? valA - valB : valB - valA;
      }
      if (["quantity", "price"].includes(key)) {
        return direction === "asc" ? Number(a[key]) - Number(b[key]) : Number(b[key]) - Number(a[key]);
      }
      const strA = String(a[key]).toLowerCase();
      const strB = String(b[key]).toLowerCase();
      return direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [transactions, filterType, sortData]);

  // sort arrow helper
  const renderSortArrow = (key) => {
      if (txSortConfig.key !== key) return null;
    return <span className="ml-1">{txSortConfig.direction === "asc" ? "▲" : "▼"}</span>;
  };

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
        {/* Header */}
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
                  {(() => {
                    const changePercent = !hideValues && totalValue > 0
                      ? (Math.abs(total24hChange) / (totalValue - total24hChange)) * 100
                      : 0;
                    const change24h = format24hChange(changePercent);
                    return (
                      <span className={`text-sm font-bold ${change24h.isPositive ? "text-green" : "text-red"}`}>
                        {!hideValues ? change24h.display : "***"} (24h)
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <TabSwitcher
              tabs={[{ id: "overview", label: "Overview" }, { id: "transactions", label: "Transactions" }]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
          <div className="flex flex-col items-end gap-4">
            <AddTransactionButton onClick={() => openAddModal()} disabled={isPending} />
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="All-time profit/loss"
                value={totalPnL}
                valueFormatted={`${isPositive ? "+" : ""}${formatCurrency(totalPnL, hideValues)}`}
                subtitle={`${isPositive ? "▲" : "▼"} ${!hideValues ? calculatePnLPercentage(totalPnL, totalCostBasis) : "**"}%`}
                isPositive={isPositive}
                hideValues={hideValues}
              />
              <StatCard label="Cost basis" value={totalCostBasis} hideValues={hideValues} />
              {bestPerformer ? (
                <StatCard
                  label="Best performer"
                  value={bestPerformer.ticker}
                  valueFormatted={bestPerformer.ticker}
                  subtitle={`▲ +${!hideValues ? calculatePnLPercentage(bestPerformer.pnl, bestPerformer.totalCost) : "**"}%`}
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
                  subtitle={`${worstPerformer.pnl >= 0 ? "▲ +" : "▼"} ${!hideValues ? calculatePnLPercentage(worstPerformer.pnl, worstPerformer.totalCost) : "**"}%`}
                  isPositive={worstPerformer.pnl >= 0}
                  hideValues={hideValues}
                />
              ) : (
                <StatCard label="Worst performer" value="-" valueFormatted="-" />
              )}
            </div>

            {/* Charts */}
            <PortfolioCharts portfolioData={portfolioData} transactions={transactions} prices={prices} hideValues={hideValues} />

            {/* Assets Table */}
            <div>
              <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white">Assets</h2>
                <FilterButtons
                  options={["All", "Stock", "Crypto"]}
                  activeFilter={filterType}
                  onFilterChange={setFilterType}
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

        {/* Transactions Tab */}
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
                        {col.label} {renderSortArrow(col.key)}
                    </th>
                    ))}
                    <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {allTransactionsSorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-[var(--text-secondary)] align-middle" style={{ height: '400px' }}>
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    allTransactionsSorted.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">{formatDateTime(tx.date, tx.time)}</td>
                        <td className="py-4 px-6"><TransactionTypeBadge type={tx.type} variant="compact" /></td>
                        <td className="py-4 px-6 text-sm font-bold text-white">{tx.ticker}</td>
                        <td className="py-4 px-6 text-sm text-right text-white">{formatQuantity(tx.quantity)}</td>
                        <td className="py-4 px-6 text-sm text-right text-[var(--text-secondary)]">{formatCurrency(tx.price, hideValues)}</td>
                        <td className="py-4 px-6 text-sm text-right font-medium text-white">{formatCurrency(tx.quantity * tx.price, hideValues)}</td>
                        <td className="py-4 px-6 text-right"><EditButton onClick={() => openEditModal(tx)} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
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
