import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactions,
} from "../services/supabaseDb";
import { fetchStockPrices, fetchCryptoPrices } from "../services/api";
import { normalizeAssetType } from "../services/utils";
import { useAuth } from "../context/AuthContext";

// query keys - centralized for consistency
// use sorted joined strings for stable keys with arrays
// transactions are scoped per user so one user's cached data can never be
// served to another account signing in within the same browser session
export const queryKeys = {
  transactions: (userId) => ["transactions", userId ?? "anonymous"],
  stockPrices: (tickers) => ["stockPrices", [...tickers].sort().join(",")],
  cryptoPrices: (tickers) => ["cryptoPrices", [...tickers].sort().join(",")],
};

/** Query key for the signed-in user's transactions. */
export function useTransactionsKey() {
  const { user } = useAuth();
  return useMemo(() => queryKeys.transactions(user?.id), [user?.id]);
}

/** Supabase URL + anon key present and user signed in (JWT in localStorage). */
export function useSupabaseReady() {
  const { session, isConfigured } = useAuth();
  return { isReady: Boolean(isConfigured && session) };
}

export function useTransactions() {
  const { isReady } = useSupabaseReady();
  const transactionsKey = useTransactionsKey();

  return useQuery({
    queryKey: transactionsKey,
    queryFn: async () => {
      const data = await fetchTransactions();
      return data;
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}

// hook to fetch prices for all assets
// separates stocks from crypto and fetches from appropriate APIs (TwelveData vs CoinGecko)
export function usePrices(transactions = []) {
  // extract unique stock tickers - memoized to prevent unnecessary re-renders
  // filters out crypto, maps to tickers, removes duplicates with Set
  const stockTickers = useMemo(() => {
    return [
      ...new Set(
        transactions
          .filter((tx) => normalizeAssetType(tx.assetType) !== "Crypto")
          .map((tx) => tx.ticker)
          .filter(Boolean) // remove empty/null tickers
      ),
    ];
  }, [transactions]);

  // extract unique crypto tickers - same pattern as stocks
  const cryptoTickers = useMemo(() => {
    return [
      ...new Set(
        transactions
          .filter((tx) => normalizeAssetType(tx.assetType) === "Crypto")
          .map((tx) => tx.ticker)
          .filter(Boolean)
      ),
    ];
  }, [transactions]);

  // create stable query keys - memoized to prevent unnecessary query refetches
  // query keys must be stable (same reference) for TanStack Query to cache properly
  const stockQueryKey = useMemo(
    () => queryKeys.stockPrices(stockTickers),
    [stockTickers]
  );
  const cryptoQueryKey = useMemo(
    () => queryKeys.cryptoPrices(cryptoTickers),
    [cryptoTickers]
  );

  // fetch stock prices from TwelveData API
  const stocksQuery = useQuery({
    queryKey: stockQueryKey,
    queryFn: () => fetchStockPrices(stockTickers),
    enabled: stockTickers.length > 0, // only fetch if stock tickers exist
    staleTime: 2 * 60 * 1000, // 2 minutes - prices change frequently
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
  });

  // fetch crypto prices from CoinGecko API
  const cryptoQuery = useQuery({
    queryKey: cryptoQueryKey,
    queryFn: () => fetchCryptoPrices(cryptoTickers),
    enabled: cryptoTickers.length > 0, // only fetch if crypto tickers exist
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
  });

  // combine prices from both queries into a single object
  // spread operator merges stock and crypto prices (tickers won't overlap)
  const prices = useMemo(
    () => ({
      ...(stocksQuery.data || {}),
      ...(cryptoQuery.data || {}),
    }),
    [stocksQuery.data, cryptoQuery.data]
  );

  // determine loading state - only loading if tickers exist to fetch
  // if no tickers, queries are disabled and won't show loading
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
  const transactionsKey = useTransactionsKey();

  return useMutation({
    mutationFn: createTransaction,
    onMutate: async (newTx) => {
      // cancel any outgoing refetches to prevent race conditions
      // race conditions = when multiple operations compete and interfere with each other
      await queryClient.cancelQueries({ queryKey: transactionsKey });

      // snapshot the previous value in case of rollback
      const previousTransactions = queryClient.getQueryData(transactionsKey);

      // optimistically update UI with temporary id
      queryClient.setQueryData(transactionsKey, (old = []) => [
        ...old,
        { ...newTx, id: "temp-" + Date.now() },
      ]);

      return { previousTransactions };
    },
    onError: (err, newTx, context) => {
      // rollback on error
      queryClient.setQueryData(transactionsKey, context.previousTransactions);
      toast.error(
        `Failed to add transaction: ${err.message || "Unknown error"}`
      );
    },
    onSuccess: () => {
      toast.success("Transaction added successfully");
    },
    onSettled: () => {
      // refetch to get the real data
      queryClient.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}

// hook to update an existing transaction
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const transactionsKey = useTransactionsKey();

  return useMutation({
    mutationFn: ({ id, data }) => updateTransaction(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: transactionsKey });

      const previousTransactions = queryClient.getQueryData(transactionsKey);

      // optimistically update the transaction
      queryClient.setQueryData(transactionsKey, (old = []) =>
        old.map((tx) => (tx.id === id ? { ...tx, ...data } : tx))
      );

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(transactionsKey, context.previousTransactions);
      toast.error(
        `Failed to update transaction: ${err.message || "Unknown error"}`
      );
    },
    onSuccess: () => {
      toast.success("Transaction updated successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}

// hook to delete a transaction
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const transactionsKey = useTransactionsKey();

  return useMutation({
    mutationFn: deleteTransaction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: transactionsKey });

      const previousTransactions = queryClient.getQueryData(transactionsKey);

      // optimistically remove the transaction
      queryClient.setQueryData(transactionsKey, (old = []) =>
        old.filter((tx) => tx.id !== id)
      );

      return { previousTransactions };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(transactionsKey, context.previousTransactions);
      toast.error(
        `Failed to delete transaction: ${err.message || "Unknown error"}`
      );
    },
    onSuccess: () => {
      toast.success("Transaction deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}

// hook to delete all transactions for an asset
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  const transactionsKey = useTransactionsKey();

  return useMutation({
    mutationFn: async ({ ticker, transactionIds }) => {
      // single batched delete; throws on failure so it surfaces in onError
      // (refetch in onSettled restores truth)
      const count = await deleteTransactions(transactionIds);
      return { ticker, count };
    },
    onMutate: async ({ ticker }) => {
      await queryClient.cancelQueries({ queryKey: transactionsKey });

      const previousTransactions = queryClient.getQueryData(transactionsKey);

      // optimistically remove all transactions for this ticker
      queryClient.setQueryData(transactionsKey, (old = []) =>
        old.filter((tx) => tx.ticker !== ticker)
      );

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(transactionsKey, context.previousTransactions);
      toast.error(`Failed to delete asset: ${err.message || "Unknown error"}`);
    },
    onSuccess: ({ ticker, count }) => {
      toast.success(`Removed ${ticker} and ${count} transaction(s)`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}
