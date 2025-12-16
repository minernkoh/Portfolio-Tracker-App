import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../services/airtable";
import { fetchStockPrices, fetchCryptoPrices } from "../services/api";

// query keys - centralized for consistency
// use sorted joined strings for stable keys with arrays
export const queryKeys = {
  transactions: ["transactions"],
  stockPrices: (tickers) => ["stockPrices", [...tickers].sort().join(",")],
  cryptoPrices: (tickers) => ["cryptoPrices", [...tickers].sort().join(",")],
};

// hook to check if airtable is configured
export function useAirtableStatus() {
  const hasAirtable = !!(
    // double bang operator - used to convert any value to a boolean
    // it is needed because we do not want the API key to be revealed
    (
      import.meta.env.VITE_AIRTABLE_API_KEY &&
      import.meta.env.VITE_AIRTABLE_BASE_ID
    )
  );
  return { isEnabled: hasAirtable };
}

// hook to fetch all transactions from airtable
export function useTransactions() {
  const { isEnabled } = useAirtableStatus();

  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async () => {
      const data = await fetchTransactions();
      return data;
    },
    enabled: isEnabled, // only fetch if airtable is configured
    staleTime: 5 * 60 * 1000, // 5 minutes in miliseconds
  });
}

// hook to fetch prices for all assets
// separates stocks from crypto and fetches from appropriate APIs
export function usePrices(transactions = []) {
  // separate stock and crypto tickers - memoize to prevent unnecessary re-renders
  const stockTickers = useMemo(() => {
    return [
      ...new Set(
        transactions
          .filter((tx) => (tx.assetType || "").toLowerCase() !== "crypto")
          .map((tx) => tx.ticker)
          .filter(Boolean)
      ),
    ];
  }, [transactions]);

  const cryptoTickers = useMemo(() => {
    return [
      ...new Set(
        transactions
          .filter((tx) => (tx.assetType || "").toLowerCase() === "crypto")
          .map((tx) => tx.ticker)
          .filter(Boolean)
      ),
    ];
  }, [transactions]);

  // create stable query keys
  const stockQueryKey = useMemo(
    () => queryKeys.stockPrices(stockTickers),
    [stockTickers]
  );
  const cryptoQueryKey = useMemo(
    () => queryKeys.cryptoPrices(cryptoTickers),
    [cryptoTickers]
  );

  // fetch stock prices
  const stocksQuery = useQuery({
    queryKey: stockQueryKey,
    queryFn: () => fetchStockPrices(stockTickers),
    enabled: stockTickers.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - prices change frequently
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
  });

  // fetch crypto prices
  const cryptoQuery = useQuery({
    queryKey: cryptoQueryKey,
    queryFn: () => fetchCryptoPrices(cryptoTickers),
    enabled: cryptoTickers.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
  });

  // combine prices from both queries
  const prices = useMemo(
    () => ({
      ...(stocksQuery.data || {}),
      ...(cryptoQuery.data || {}),
    }),
    [stocksQuery.data, cryptoQuery.data]
  );

  // determine loading state - only loading if we have tickers to fetch
  const isLoading =
    (stockTickers.length > 0 && stocksQuery.isLoading) ||
    (cryptoTickers.length > 0 && cryptoQuery.isLoading);

  return {
    prices,
    isLoading,
    isFetching: stocksQuery.isFetching || cryptoQuery.isFetching,
    error: stocksQuery.error || cryptoQuery.error,
  };
}

// hook to add a new transaction
export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onMutate: async (newTx) => {
      // cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });

      // snapshot the previous value
      const previousTransactions = queryClient.getQueryData(
        queryKeys.transactions
      );

      // optimistically update with temporary id
      queryClient.setQueryData(queryKeys.transactions, (old = []) => [
        ...old,
        { ...newTx, id: "temp-" + Date.now() },
      ]);

      return { previousTransactions };
    },
    onError: (err, newTx, context) => {
      // rollback on error
      queryClient.setQueryData(
        queryKeys.transactions,
        context.previousTransactions
      );
      toast.error(
        `Failed to add transaction: ${err.message || "Unknown error"}`
      );
    },
    onSuccess: () => {
      toast.success("Transaction added successfully");
    },
    onSettled: () => {
      // refetch to get the real data
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

// hook to update an existing transaction
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateTransaction(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });

      const previousTransactions = queryClient.getQueryData(
        queryKeys.transactions
      );

      // optimistically update the transaction
      queryClient.setQueryData(queryKeys.transactions, (old = []) =>
        old.map((tx) => (tx.id === id ? { ...tx, ...data } : tx))
      );

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.transactions,
        context.previousTransactions
      );
      toast.error(
        `Failed to update transaction: ${err.message || "Unknown error"}`
      );
    },
    onSuccess: () => {
      toast.success("Transaction updated successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

// hook to delete a transaction
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });

      const previousTransactions = queryClient.getQueryData(
        queryKeys.transactions
      );

      // optimistically remove the transaction
      queryClient.setQueryData(queryKeys.transactions, (old = []) =>
        old.filter((tx) => tx.id !== id)
      );

      return { previousTransactions };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(
        queryKeys.transactions,
        context.previousTransactions
      );
      toast.error(
        `Failed to delete transaction: ${err.message || "Unknown error"}`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

// hook to delete all transactions for an asset
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticker, transactionIds }) => {
      // delete each transaction one by one to avoid rate limits
      for (const id of transactionIds) {
        await deleteTransaction(id);
      }
      return { ticker, count: transactionIds.length };
    },
    onMutate: async ({ ticker }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });

      const previousTransactions = queryClient.getQueryData(
        queryKeys.transactions
      );

      // optimistically remove all transactions for this ticker
      queryClient.setQueryData(queryKeys.transactions, (old = []) =>
        old.filter((tx) => tx.ticker !== ticker)
      );

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.transactions,
        context.previousTransactions
      );
      toast.error(`Failed to delete asset: ${err.message || "Unknown error"}`);
    },
    onSuccess: ({ ticker, count }) => {
      toast.success(`Removed ${ticker} and ${count} transaction(s)`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}
