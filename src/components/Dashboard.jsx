// this is the main dashboard component - it's the heart of the app
// it displays your portfolio, handles adding/editing transactions, and calculates all the numbers

import React, { useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import Layout from "./Layout";
import PortfolioCharts from "./PortfolioCharts";
import PortfolioTable from "./PortfolioTable";
import TransactionFormModal from "./TransactionFormModal";
import { fetchStockPrices, fetchCryptoPrices } from "../services/api";
import {
  calculateValue,
  calculateUnrealizedPnL,
  formatCurrency,
  calculatePortfolioData,
} from "../services/utils";
import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../services/airtable";
import {
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAirtableEnabled, setIsAirtableEnabled] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [hideValues, setHideValues] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [txSortConfig, setTxSortConfig] = useState({
    // sort transactions table
    key: "date",
    direction: "desc",
  });
  const [filterType, setFilterType] = useState("All");

  // is the transaction form modal open?
  const [isFormOpen, setIsFormOpen] = useState(false);

  // which transaction we're editing (null if adding new)
  const [editingTransaction, setEditingTransaction] = useState(null);

  // function to fetch prices for all assets in transactions
  // this separates stocks from crypto and fetches prices from the right api
  const fetchAllPrices = useCallback(async (txs) => {
    try {
      // separate stock tickers from crypto tickers
      const stockTickers = [];
      const cryptoTickers = [];

      txs.forEach((tx) => {
        const ticker = tx.ticker;
        const assetType = (tx.assetType || "").toLowerCase();

        // if it's crypto, add to crypto list
        if (assetType === "crypto") {
          if (!cryptoTickers.includes(ticker)) {
            cryptoTickers.push(ticker);
          }
        } else {
          // otherwise it's a stock
          if (!stockTickers.includes(ticker)) {
            stockTickers.push(ticker);
          }
        }
      });

      const priceMap = {};

      // fetch stock prices from twelvedata api
      if (stockTickers.length > 0) {
        const stockPrices = await fetchStockPrices(stockTickers);
        Object.assign(priceMap, stockPrices);
      }

      // fetch crypto prices from coingecko api
      if (cryptoTickers.length > 0) {
        const cryptoPrices = await fetchCryptoPrices(cryptoTickers);
        Object.assign(priceMap, cryptoPrices);
      }

      return priceMap;
    } catch (error) {
      console.error("error fetching prices:", error);
      toast.error("failed to fetch some prices. using cached data.");
      return {};
    }
  }, []);

  // calculate portfolio data from transactions and prices
  // uses shared utility function to avoid code duplication
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

  const isPositive = totalPnL >= 0;

  // load data when component first mounts (when page loads)
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);

        // check if airtable api keys are configured
        const hasAirtable =
          import.meta.env.VITE_AIRTABLE_API_KEY &&
          import.meta.env.VITE_AIRTABLE_BASE_ID;
        setIsAirtableEnabled(!!hasAirtable);

        let currentTransactions = [];

        if (hasAirtable) {
          try {
            // fetch all transactions from airtable database
            const remoteData = await fetchTransactions();
            currentTransactions = remoteData;
            toast.success("data loaded");
          } catch (error) {
            console.error("airtable fetch failed:", error);
            toast.error("failed to load from airtable. check your api keys.");
          }
        } else {
          toast.error(
            "airtable configuration missing. please add your api keys."
          );
        }

        setTransactions(currentTransactions);

        // fetch real-time prices for all assets
        const priceMap = await fetchAllPrices(currentTransactions);
        setPrices(priceMap);
      } catch (error) {
        console.error("failed to initialize dashboard:", error);
        toast.error("failed to load portfolio data. please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [fetchAllPrices]);

  // refresh prices when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      fetchAllPrices(transactions).then((priceMap) => {
        setPrices((prev) => ({ ...prev, ...priceMap }));
      });
    }
  }, [transactions, fetchAllPrices]);

  // handler function: add a new transaction
  const handleAddTransaction = useCallback(
    async (newTx) => {
      if (!isAirtableEnabled) {
        toast.error("airtable not connected. cannot add transaction.");
        return;
      }

      setOperationLoading(true);
      try {
        // save transaction to airtable database
        const addedTx = await createTransaction(newTx);
        if (addedTx) {
          // add to local state so ui updates immediately
          setTransactions((prev) => [...prev, addedTx]);
          toast.success("transaction added successfully");

          // fetch price for new asset if we don't have it yet
          if (!prices[newTx.ticker]) {
            const newPriceMap = await fetchAllPrices([
              ...transactions,
              addedTx,
            ]);
            setPrices((prev) => ({ ...prev, ...newPriceMap }));
          }
        }
      } catch (err) {
        console.error("add transaction failed", err);
        toast.error(
          `failed to add transaction: ${err.message || "unknown error"}`
        );
      } finally {
        setOperationLoading(false);
      }
    },
    [isAirtableEnabled, prices, transactions, fetchAllPrices]
  );

  // handler function: edit an existing transaction
  const handleEditTransaction = useCallback(
    async (updatedTx) => {
      if (!isAirtableEnabled) return;

      setOperationLoading(true);
      try {
        // update transaction in airtable database
        const result = await updateTransaction(updatedTx.id, updatedTx);
        if (result) {
          // update local state
          setTransactions((prev) =>
            prev.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx))
          );
          toast.success("transaction updated successfully");
        }
      } catch (err) {
        console.error("update transaction failed", err);
        toast.error(
          `failed to update transaction: ${err.message || "unknown error"}`
        );
      } finally {
        setOperationLoading(false);
      }
    },
    [isAirtableEnabled]
  );

  // handler function: delete all transactions for an asset
  const handleDeleteAsset = useCallback(
    async (ticker) => {
      if (!isAirtableEnabled) return;

      // ask user to confirm before deleting
      if (
        !window.confirm(
          `are you sure you want to remove ${ticker}? this will delete all transactions associated with it.`
        )
      )
        return;

      setOperationLoading(true);
      try {
        // find all transactions for this ticker
        const txsToDelete = transactions.filter((tx) => tx.ticker === ticker);

        // delete each transaction from airtable
        // we do this one by one to avoid hitting rate limits
        for (const tx of txsToDelete) {
          await deleteTransaction(tx.id);
        }

        // remove from local state
        setTransactions((prev) => prev.filter((tx) => tx.ticker !== ticker));
        toast.success(
          `removed ${ticker} and ${txsToDelete.length} transaction(s)`
        );
      } catch (err) {
        console.error("delete asset failed", err);
        toast.error(
          `failed to delete asset: ${err.message || "unknown error"}`
        );
      } finally {
        setOperationLoading(false);
      }
    },
    [transactions, isAirtableEnabled]
  );

  // open the add transaction modal
  const openAddModal = useCallback((ticker = null) => {
    // if ticker is provided, pre-fill it in the form
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
      // if clicking same column, toggle direction; otherwise set to ascending
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
        // sort by date
        if (txSortConfig.key === "date") {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return txSortConfig.direction === "asc"
            ? dateA - dateB
            : dateB - dateA;
        }

        // sort by numeric values (quantity, price, total)
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

        // sort by string values (ticker, type)
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
  // this hook must be called before any conditional returns (rules of hooks)
  const filteredPortfolioData = useMemo(() => {
    if (filterType === "All") return portfolioData;
    return portfolioData.filter((asset) => asset.assetType === filterType);
  }, [portfolioData, filterType]);

  // show loading screen while data is being fetched
  // this conditional return must come AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-white/50">
        Loading data...
      </div>
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
              </div>
              <div className="flex flex-col">
                {/* total portfolio value */}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">
                    {formatCurrency(totalValue, hideValues)}
                  </span>
                </div>
                {/* total profit/loss */}
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`text-sm font-bold ${
                      isPositive ? "text-green" : "text-red"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(totalPnL, hideValues)}
                  </span>
                  {/* profit/loss percentage */}
                  <span
                    className={`text-sm font-bold ${
                      isPositive ? "text-green" : "text-red"
                    }`}
                  >
                    {isPositive ? "▲" : "▼"}
                    {!hideValues
                      ? totalValue > 0
                        ? (
                            (Math.abs(totalPnL) /
                              (totalValue - Math.abs(totalPnL))) *
                            100
                          ).toFixed(2)
                        : "0.00"
                      : "***"}
                    % (all-time)
                  </span>
                </div>
              </div>
            </div>

            {/* tab switcher - overview vs transactions */}
            <div className="flex gap-4 border-b border-[var(--border-subtle)] w-fit mt-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-2 text-sm font-bold transition-all border-b-2 ${
                  activeTab === "overview"
                    ? "border-[var(--accent-blue)] text-white"
                    : "border-transparent text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`pb-2 text-sm font-bold transition-all border-b-2 ${
                  activeTab === "transactions"
                    ? "border-[var(--accent-blue)] text-white"
                    : "border-transparent text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                Transactions
              </button>
            </div>
          </div>

          {/* action buttons */}
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 bg-[var(--accent-blue)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors"
              >
                <PlusIcon size={16} /> Add Transaction
              </button>
            </div>
          </div>
        </div>

        {/* overview tab content */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* summary cards showing key metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* all-time profit/loss card */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">
                  All-time profit/loss
                </div>
                <div
                  className={`text-lg font-bold ${
                    isPositive ? "text-green" : "text-red"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrency(totalPnL, hideValues)}
                </div>
                <div
                  className={`text-xs font-bold ${
                    isPositive ? "text-green" : "text-red"
                  }`}
                >
                  {isPositive ? "▲" : "▼"}{" "}
                  {!hideValues
                    ? totalCostBasis > 0
                      ? ((totalPnL / totalCostBasis) * 100).toFixed(2)
                      : "0.00"
                    : "**"}
                  %
                </div>
              </div>

              {/* cost basis card */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">
                  Cost basis
                </div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(totalCostBasis, hideValues)}
                </div>
              </div>

              {/* best performer card */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">
                  Best performer
                </div>
                {bestPerformer ? (
                  <>
                    <div className="text-lg font-bold text-white truncate">
                      {bestPerformer.name}
                    </div>
                    <div className="text-xs font-bold text-green">
                      ▲ +
                      {!hideValues
                        ? bestPerformer.totalCost > 0
                          ? (
                              (bestPerformer.pnl / bestPerformer.totalCost) *
                              100
                            ).toFixed(2)
                          : "0.00"
                        : "**"}
                      %
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[var(--text-secondary)]">-</div>
                )}
              </div>

              {/* worst performer card */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">
                  Worst performer
                </div>
                {worstPerformer ? (
                  <>
                    <div className="text-lg font-bold text-white truncate">
                      {worstPerformer.name}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        worstPerformer.pnl >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {worstPerformer.pnl >= 0 ? "▲ +" : "▼"}{" "}
                      {!hideValues
                        ? worstPerformer.totalCost > 0
                          ? (
                              (worstPerformer.pnl / worstPerformer.totalCost) *
                              100
                            ).toFixed(2)
                          : "0.00"
                        : "**"}
                      %
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[var(--text-secondary)]">-</div>
                )}
              </div>
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
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1 rounded-lg flex items-center gap-1 w-fit">
                  {["All", "Stock", "Crypto"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        filterType === type
                          ? "bg-[var(--border-highlight)] text-white shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      {type === "Stock" ? "Stocks" : type}
                    </button>
                  ))}
                </div>
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
                    <tr>
                      <td
                        colSpan="7"
                        className="py-8 text-center text-[var(--text-secondary)]"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    allTransactionsSorted.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">
                          {tx.date}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${
                              tx.type === "Buy"
                                ? "text-green bg-green-900/20"
                                : "text-red bg-red-900/20"
                            }`}
                          >
                            {tx.type}
                          </span>
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
                          <button
                            onClick={() => openEditModal(tx)}
                            className="text-[var(--text-secondary)] hover:text-white transition-colors"
                          >
                            <PencilSimpleIcon size={18} />
                          </button>
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
              setEditingTransaction(null); // reset editing state when closing
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
          />
        )}
      </div>
    </Layout>
  );
}
