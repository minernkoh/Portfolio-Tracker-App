import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../services/api-client";
import { fetchStockPrices, fetchCryptoPrices, fetchCommodityPrices } from "../services/api";
import { normalizeAssetType } from "../services/utils";
import { CACHE_DURATION_MS, REFETCH_INTERVAL_MS } from "../constants/config";
import { fetchHistoricalPricesForTransactions } from "../services/historicalPrices";

// query keys - centralized for consistency
// use sorted joined strings for stable keys with arrays
export const queryKeys = {
  transactions: ["transactions"],
  stockPrices: (tickers) => ["stockPrices", [...tickers].sort().join(",")],
  cryptoPrices: (tickers) => ["cryptoPrices", [...tickers].sort().join(",")],
  commodityPrices: (tickers) => ["commodityPrices", [...tickers].sort().join(",")],
  historicalPrices: (txIds) => ["historicalPrices", [...txIds].sort().join(",")],
};

// hook to check if backend API is configured (PostgreSQL backend)
export function useAirtableStatus() {
  const hasApi = !!import.meta.env.VITE_API_URL;
  return { isEnabled: hasApi };
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
    enabled: isEnabled,
    staleTime: CACHE_DURATION_MS.TRANSACTIONS,
  });
}

// hook to fetch prices for all assets
// separates stocks from crypto and fetches from appropriate APIs (TwelveData vs CoinGecko)
export function usePrices(transactions = []) {
  // extract unique stock tickers - memoized to prevent unnecessary re-renders
  // filters out crypto and commodity, maps to tickers, removes duplicates with Set
  const stockTickers = useMemo(() => {
    return [
      ...new Set(
        transactions
          .filter((tx) => {
            const type = normalizeAssetType(tx.assetType);
            return type !== "Crypto" && type !== "Commodity";
          })
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

  // extract unique commodity tickers
  const commodityTickers = useMemo(() => {
    return [
      ...new Set(
        transactions
          .filter((tx) => normalizeAssetType(tx.assetType) === "Commodity")
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
  const commodityQueryKey = useMemo(
    () => queryKeys.commodityPrices(commodityTickers),
    [commodityTickers]
  );

  // fetch stock prices from TwelveData API
  const stocksQuery = useQuery({
    queryKey: stockQueryKey,
    queryFn: () => fetchStockPrices(stockTickers),
    enabled: stockTickers.length > 0,
    staleTime: CACHE_DURATION_MS.PRICES,
    refetchInterval: REFETCH_INTERVAL_MS.PRICES,
  });

  // fetch crypto prices from CoinGecko API
  const cryptoQuery = useQuery({
    queryKey: cryptoQueryKey,
    queryFn: () => fetchCryptoPrices(cryptoTickers),
    enabled: cryptoTickers.length > 0,
    staleTime: CACHE_DURATION_MS.PRICES,
    refetchInterval: REFETCH_INTERVAL_MS.PRICES,
  });

  // fetch commodity prices from BullionStar API
  const commodityQuery = useQuery({
    queryKey: commodityQueryKey,
    queryFn: () => fetchCommodityPrices(commodityTickers),
    enabled: commodityTickers.length > 0,
    staleTime: CACHE_DURATION_MS.PRICES,
    refetchInterval: REFETCH_INTERVAL_MS.PRICES,
  });

  // combine prices from all three queries into a single object
  // spread operator merges stock, crypto, and commodity prices (tickers won't overlap)
  const prices = useMemo(
    () => ({
      ...(stocksQuery.data || {}),
      ...(cryptoQuery.data || {}),
      ...(commodityQuery.data || {}),
    }),
    [stocksQuery.data, cryptoQuery.data, commodityQuery.data]
  );

  // determine loading state - only loading if tickers exist to fetch
  // if no tickers, queries are disabled and won't show loading
  const isLoading =
    (stockTickers.length > 0 && stocksQuery.isLoading) ||
    (cryptoTickers.length > 0 && cryptoQuery.isLoading) ||
    (commodityTickers.length > 0 && commodityQuery.isLoading);

  return {
    prices,
    isLoading,
    isFetching: stocksQuery.isFetching || cryptoQuery.isFetching || commodityQuery.isFetching,
    error: stocksQuery.error || cryptoQuery.error || commodityQuery.error,
  };
}

// hook to fetch historical prices for all transaction dates
export function useHistoricalPrices(transactions = []) {
  const { isEnabled } = useAirtableStatus();

  // Create stable query key based on transaction IDs and dates
  const queryKey = useMemo(() => {
    const txKey = transactions
      .map((tx) => `${tx.id}-${tx.date}`)
      .sort()
      .join(",");
    return queryKeys.historicalPrices([txKey]);
  }, [transactions]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const prices = await fetchHistoricalPricesForTransactions(transactions);
      return prices;
    },
    enabled: isEnabled && transactions.length > 0,
    staleTime: CACHE_DURATION_MS.HISTORICAL_PRICES,
    refetchOnWindowFocus: false, // Don't refetch historical prices on window focus
  });
}

// hook to add a new transaction
export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onMutate: async (newTx) => {
      // cancel any outgoing refetches to prevent race conditions
      // race conditions = when multiple operations compete and interfere with each other
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });

      // snapshot the previous value in case of rollback
      const previousTransactions = queryClient.getQueryData(
        queryKeys.transactions
      );

      // optimistically update UI with temporary id
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
