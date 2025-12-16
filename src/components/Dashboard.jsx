// this is the main dashboard component
// it displays portfolio, handles adding/editing transactions, and calculates all the numbers

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
import EmptyState from "./ui/EmptyState";
import {
  formatCurrency,
  calculatePortfolioData,
  truncateName,
  formatDateTime,
} from "../services/utils";
import {
  useTransactions,
  usePrices,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteAsset,
  useAirtableStatus,
} from "../hooks/usePortfolio";
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";

export default function Dashboard() {
  // TanStack Query hooks for data fetching
  const { isEnabled: isAirtableEnabled } = useAirtableStatus();
  const {
    data: transactions = [],
    isLoading,
    error: loadError,
    refetch,
  } = useTransactions();
  const { prices, isFetching: pricesFetching } = usePrices(transactions);

  // mutation hooks for CRUD operations
  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteAsset = useDeleteAsset();

  // UI state (not data-related)
  const [hideValues, setHideValues] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [txSortConfig, setTxSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [filterType, setFilterType] = useState("All");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // calculate portfolio data from transactions and prices
  const portfolioData = useMemo(() => {
    return calculatePortfolioData(transactions, prices);
  }, [transactions, prices]);

  // calculate total portfolio value and profit/loss
  const totalValue = useMemo(() => {
    return portfolioData.reduce((sum, asset) => sum + asset.totalValue, 0);
  }, [portfolioData]);

  const totalPnL = useMemo(() => {
    return portfolioData.reduce((sum, asset) => sum + asset.pnl, 0);
  }, [portfolioData]);

  // calculate 24h change for entire portfolio
  const total24hChange = useMemo(() => {
    return portfolioData.reduce((sum, asset) => {
      // 24h change = (priceChange24h% / 100) * currentPrice * quantity
      const change24h =
        (asset.priceChange24h / 100) * asset.currentPrice * asset.quantity;
      return sum + change24h;
    }, 0);
  }, [portfolioData]);

  const is24hPositive = total24hChange >= 0;
  const isPositive = totalPnL >= 0;

  // handler function: add a new transaction
  const handleAddTransaction = useCallback(
    async (newTx) => {
      addTransaction.mutate(newTx);
    },
    [addTransaction]
  );

  // handler function: edit an existing transaction
  const handleEditTransaction = useCallback(
    async (updatedTx) => {
      // use mutateAsync to properly await the mutation and propagate errors
      await updateTransaction.mutateAsync({
        id: updatedTx.id,
        data: updatedTx,
      });
    },
    [updateTransaction]
  );

  // handler function: delete all transactions for an asset
  const handleDeleteAsset = useCallback(
    async (ticker) => {
      if (
        !window.confirm(
          `Are you sure you want to remove ${ticker}? This will delete all transactions associated with it.`
        )
      )
        return;

      const txsToDelete = transactions.filter((tx) => tx.ticker === ticker);
      deleteAsset.mutate({
        ticker,
        transactionIds: txsToDelete.map((tx) => tx.id),
      });
    },
    [transactions, deleteAsset]
  );

  // open the add transaction modal
  const openAddModal = useCallback((ticker = null) => {
    if (ticker) {
      setEditingTransaction({ ticker, isNew: true });
    } else {
      setEditingTransaction(null);
    }
    setIsFormOpen(true);
  }, []);

  // open the edit transaction modal
  const openEditModal = useCallback((tx) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  }, []);

  // handler for sorting transactions table
  const handleTxSort = useCallback((key) => {
    setTxSortConfig((current) => {
      let direction = "asc";
      if (current.key === key && current.direction === "asc") {
        direction = "desc";
      }
      return { key, direction };
    });
  }, []);

  // calculate sorted and filtered transactions for the transactions tab
  const allTransactionsSorted = useMemo(() => {
    return [...transactions]
      .filter((tx) =>
        filterType === "All" ? true : tx.assetType === filterType
      )
      .sort((a, b) => {
        if (txSortConfig.key === "date") {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return txSortConfig.direction === "asc"
            ? dateA - dateB
            : dateB - dateA;
        }

        const numericKeys = ["quantity", "price"];
        if (
          numericKeys.includes(txSortConfig.key) ||
          txSortConfig.key === "cost"
        ) {
          const valA =
            txSortConfig.key === "cost"
              ? a.quantity * a.price
              : Number(a[txSortConfig.key]);
          const valB =
            txSortConfig.key === "cost"
              ? b.quantity * b.price
              : Number(b[txSortConfig.key]);
          return txSortConfig.direction === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(a[txSortConfig.key]).toLowerCase();
        const strB = String(b[txSortConfig.key]).toLowerCase();
        if (strA < strB) return txSortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return txSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [transactions, filterType, txSortConfig]);

  // helper to show sort arrow in table header
  const renderSortArrow = useCallback(
    (key) => {
      if (txSortConfig.key !== key) return null;
      return (
        <span className="ml-1">
          {txSortConfig.direction === "asc" ? "▲" : "▼"}
        </span>
      );
    },
    [txSortConfig]
  );

  // filter portfolio data by asset type
  const filteredPortfolioData = useMemo(() => {
    if (filterType === "All") return portfolioData;
    return portfolioData.filter((asset) => asset.assetType === filterType);
  }, [portfolioData, filterType]);

  // show loading screen while data is being fetched
  if (isLoading) {
    return <LoadingState fullScreen={false} />;
  }

  // show error screen with retry button if loading failed
  if (loadError || (!isAirtableEnabled && transactions.length === 0)) {
    const errorMessage = !isAirtableEnabled
      ? "Airtable configuration missing. Please add your API keys to .env file."
      : loadError?.message ||
        "Failed to load portfolio data. Please try again.";

    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-8 max-w-md w-full">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Failed to Load Data
            </h2>
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

  // calculate summary metrics for the overview cards
  const totalCostBasis = portfolioData.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );

  // find best and worst performing assets
  const sortedByPerf = [...portfolioData].sort((a, b) => {
    const pnlPercentA = a.totalCost > 0 ? a.pnl / a.totalCost : 0;
    const pnlPercentB = b.totalCost > 0 ? b.pnl / b.totalCost : 0;
    return pnlPercentB - pnlPercentA;
  });
  const bestPerformer = sortedByPerf.length > 0 ? sortedByPerf[0] : null;
  const worstPerformer =
    sortedByPerf.length > 0 ? sortedByPerf[sortedByPerf.length - 1] : null;

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* header section with portfolio total */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-white">My Portfolio</h1>
                {/* button to hide/show portfolio values */}
                <button
                  onClick={() => setHideValues((prev) => !prev)}
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  title={hideValues ? "Show values" : "Hide values"}
                >
                  {hideValues ? (
                    <EyeSlashIcon size={18} />
                  ) : (
                    <EyeIcon size={18} />
                  )}
                </button>
                {/* show indicator when prices are refreshing */}
                {pricesFetching && (
                  <span className="text-xs text-[var(--text-secondary)] animate-pulse">
                    Updating prices...
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                {/* total portfolio value */}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">
                    {formatCurrency(totalValue, hideValues)}
                  </span>
                </div>
                {/* 24h change */}
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`text-sm font-bold ${
                      is24hPositive ? "text-green" : "text-red"
                    }`}
                  >
                    {is24hPositive ? "+" : ""}
                    {formatCurrency(total24hChange, hideValues)}
                  </span>
                  {/* 24h percentage */}
                  <span
                    className={`text-sm font-bold ${
                      is24hPositive ? "text-green" : "text-red"
                    }`}
                  >
                    {is24hPositive ? "▲" : "▼"}
                    {!hideValues
                      ? totalValue > 0
                        ? (
                            (Math.abs(total24hChange) /
                              (totalValue - total24hChange)) *
                            100
                          ).toFixed(2)
                        : "0.00"
                      : "***"}
                    % (24h)
                  </span>
                </div>
              </div>
            </div>

            {/* tab switcher - overview vs transactions */}
            <TabSwitcher
              tabs={[
                { id: "overview", label: "Overview" },
                { id: "transactions", label: "Transactions" },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* action buttons */}
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-2">
              <AddTransactionButton
                onClick={() => openAddModal()}
                disabled={addTransaction.isPending}
              />
            </div>
          </div>
        </div>

        {/* overview tab content */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* summary cards showing key metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* all-time profit/loss card */}
              <StatCard
                label="All-time profit/loss"
                value={totalPnL}
                valueFormatted={`${isPositive ? "+" : ""}${formatCurrency(totalPnL, hideValues)}`}
                subtitle={`${isPositive ? "▲" : "▼"} ${
                  !hideValues
                    ? totalCostBasis > 0
                      ? ((totalPnL / totalCostBasis) * 100).toFixed(2)
                      : "0.00"
                    : "**"
                }%`}
                isPositive={isPositive}
                hideValues={hideValues}
              />

              {/* cost basis card */}
              <StatCard
                label="Cost basis"
                value={totalCostBasis}
                hideValues={hideValues}
              />

              {/* best performer card */}
              {bestPerformer ? (
                <StatCard
                  label="Best performer"
                  value={bestPerformer.name}
                  valueFormatted={truncateName(bestPerformer.name, 20)}
                  subtitle={`▲ +${
                    !hideValues
                      ? bestPerformer.totalCost > 0
                        ? (
                            (bestPerformer.pnl / bestPerformer.totalCost) *
                            100
                          ).toFixed(2)
                        : "0.00"
                      : "**"
                  }%`}
                  isPositive={true}
                  hideValues={hideValues}
                />
              ) : (
                <StatCard
                  label="Best performer"
                  value="-"
                  valueFormatted="-"
                />
              )}

              {/* worst performer card */}
              {worstPerformer ? (
                <StatCard
                  label="Worst performer"
                  value={worstPerformer.name}
                  valueFormatted={truncateName(worstPerformer.name, 20)}
                  subtitle={`${worstPerformer.pnl >= 0 ? "▲ +" : "▼"} ${
                    !hideValues
                      ? worstPerformer.totalCost > 0
                        ? (
                            (worstPerformer.pnl / worstPerformer.totalCost) *
                            100
                          ).toFixed(2)
                        : "0.00"
                      : "**"
                  }%`}
                  isPositive={worstPerformer.pnl >= 0}
                  hideValues={hideValues}
                />
              ) : (
                <StatCard
                  label="Worst performer"
                  value="-"
                  valueFormatted="-"
                />
              )}
            </div>

            {/* charts section */}
            <PortfolioCharts
              portfolioData={portfolioData}
              transactions={transactions}
              prices={prices}
              hideValues={hideValues}
            />

            {/* assets table section */}
            <div>
              <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white">Assets</h2>

                {/* filter buttons */}
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

        {/* transactions tab content */}
        {activeTab === "transactions" && (
          <div className="animate-slide-up bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer select-none">
                    <th
                      className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white"
                      onClick={() => handleTxSort("date")}
                    >
                      Date {renderSortArrow("date")}
                    </th>
                    <th
                      className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white"
                      onClick={() => handleTxSort("type")}
                    >
                      Type {renderSortArrow("type")}
                    </th>
                    <th
                      className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white"
                      onClick={() => handleTxSort("ticker")}
                    >
                      Asset {renderSortArrow("ticker")}
                    </th>
                    <th
                      className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white"
                      onClick={() => handleTxSort("quantity")}
                    >
                      Quantity {renderSortArrow("quantity")}
                    </th>
                    <th
                      className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white"
                      onClick={() => handleTxSort("price")}
                    >
                      Price {renderSortArrow("price")}
                    </th>
                    <th
                      className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white"
                      onClick={() => handleTxSort("cost")}
                    >
                      Cost {renderSortArrow("cost")}
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {allTransactionsSorted.length === 0 ? (
                    <EmptyState message="No transactions found." colSpan={7} />
                  ) : (
                    allTransactionsSorted.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">
                          {formatDateTime(tx.date)}
                        </td>
                        <td className="py-4 px-6">
                          <TransactionTypeBadge type={tx.type} variant="compact" />
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-white">
                          {tx.ticker}
                        </td>
                        <td className="py-4 px-6 text-sm text-right text-white">
                          {tx.quantity}
                        </td>
                        <td className="py-4 px-6 text-sm text-right text-[var(--text-secondary)]">
                          {formatCurrency(tx.price, hideValues)}
                        </td>
                        <td className="py-4 px-6 text-sm text-right font-medium text-white">
                          {formatCurrency(tx.quantity * tx.price, hideValues)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <EditButton onClick={() => openEditModal(tx)} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* transaction form modal */}
        {isFormOpen && (
          <TransactionFormModal
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setEditingTransaction(null);
            }}
            onSubmit={
              editingTransaction &&
              editingTransaction.id &&
              !editingTransaction.isNew
                ? handleEditTransaction
                : handleAddTransaction
            }
            initialData={editingTransaction}
            isEditMode={
              !!(
                editingTransaction &&
                editingTransaction.id &&
                !editingTransaction.isNew
              )
            }
            portfolioData={portfolioData}
          />
        )}
      </div>
    </Layout>
  );
}
