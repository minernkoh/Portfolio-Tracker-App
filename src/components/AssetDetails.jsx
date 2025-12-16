// this component shows detailed information about a specific asset
// it displays the asset's current price, holdings, profit/loss, and transaction history

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilSimpleIcon, TrendUpIcon, TrendDownIcon, PlusIcon } from '@phosphor-icons/react';
import { formatCurrency, calculatePortfolioData, formatDateTime } from '../services/utils';
import Layout from './Layout';
import TransactionFormModal from './TransactionFormModal';
import {
  useTransactions,
  usePrices,
  useAddTransaction,
  useUpdateTransaction,
} from '../hooks/usePortfolio';

export default function AssetDetails() {
  // get the ticker from the url (e.g., /asset/AAPL)
  const { ticker } = useParams();
  
  // TanStack Query hooks
  const { data: transactions = [], isLoading } = useTransactions();
  const { prices } = usePrices(transactions);
  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();
  
  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // calculate portfolio data using shared utility function
  const portfolioData = useMemo(() => {
    return calculatePortfolioData(transactions, prices);
  }, [transactions, prices]);
  
  // find the asset
  const asset = portfolioData.find(a => a.ticker === ticker);
  
  // open the add transaction modal with ticker pre-filled
  const openAddModal = useCallback(() => {
    if (asset) {
      setEditingTransaction({
        ticker: asset.ticker,
        name: asset.name,
        assetType: asset.assetType,
        logo: asset.logo,
        isNew: true,
      });
    } else {
      setEditingTransaction({
        ticker: ticker,
        isNew: true,
      });
    }
    setIsFormOpen(true);
  }, [asset, ticker]);
  
  const openEditModal = useCallback((tx) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  }, []);

  // handler for adding a new transaction
  const handleAddTransaction = useCallback(
    async (newTx) => {
      addTransaction.mutate(newTx);
      setIsFormOpen(false);
      setEditingTransaction(null);
    },
    [addTransaction]
  );

  // handler for updating a transaction
  const handleUpdateTransaction = useCallback(
    async (updatedTx) => {
      // use mutateAsync to properly await the mutation and propagate errors
      await updateTransaction.mutateAsync({ id: updatedTx.id, data: updatedTx });
      // only close modal after successful update
      setIsFormOpen(false);
      setEditingTransaction(null);
    },
    [updateTransaction]
  );
  
  // if loading
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-white/50">
          Loading data...
        </div>
      </Layout>
    );
  }
  
  // if asset not found, show error message
  if (!asset) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-10">
          <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon size={20} /> Back to Dashboard
          </Link>
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-8 text-center">
            <p className="text-[var(--text-secondary)]">Asset not found!</p>
          </div>
        </div>
      </Layout>
    );
  }

  // calculate profit/loss percentage
  const isProfitable = asset.pnl >= 0;
  const pnlPercent = asset.totalCost > 0 ? ((asset.pnl / asset.totalCost) * 100).toFixed(2) : '0.00';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-10 animate-fade-in">
      {/* back button */}
      <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-white mb-6 transition-colors">
        <ArrowLeftIcon size={20} /> Back to Dashboard
      </Link>
      
      {/* asset header card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* asset logo */}
            {asset.logo && (
              <img 
                src={asset.logo} 
                alt={asset.name} 
                className="w-16 h-16 rounded-full bg-transparent object-cover"
                onError={(e) => {
                  // if logo fails, show fallback
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${asset.ticker}&background=random`;
                }}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{asset.name}</h1>
              <p className="text-[var(--text-secondary)]">{asset.ticker} • {asset.assetType}</p>
            </div>
          </div>
          
          {/* current price and 24h change */}
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{formatCurrency(asset.currentPrice)}</div>
            <div className={`flex items-center gap-1 justify-end mt-1 ${asset.priceChange24h >= 0 ? 'text-green' : 'text-red'}`}>
              {asset.priceChange24h >= 0 ? <TrendUpIcon size={16} /> : <TrendDownIcon size={16} />}
              <span className="text-sm font-bold">{Math.abs(asset.priceChange24h).toFixed(2)}%</span>
            </div>
          </div>
        </div>
        
        {/* stats grid showing key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border-subtle)]">
          {/* holdings (how many shares/coins you own) */}
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">Holdings</div>
            <div className="text-lg font-bold text-white">{asset.quantity} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}</div>
          </div>
          
          {/* market value (current worth) */}
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">Market value</div>
            <div className="text-lg font-bold text-white">{formatCurrency(asset.totalValue)}</div>
          </div>
          
          {/* average buy price */}
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">Avg price</div>
            <div className="text-lg font-bold text-white">{formatCurrency(asset.avgPrice)}</div>
          </div>
          
          {/* profit/loss */}
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">Profit/loss</div>
            <div className={`text-lg font-bold ${isProfitable ? 'text-green' : 'text-red'}`}>
              {isProfitable ? '+' : ''}{formatCurrency(asset.pnl)}
              <span className="text-xs ml-1">({isProfitable ? '+' : ''}{pnlPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* transaction history table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Transaction history</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{asset.transactions?.length || 0} transactions</p>
          </div>
          <button
            onClick={openAddModal}
            disabled={addTransaction.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-app)] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <PlusIcon size={18} weight="bold" />
            Add Transaction
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--bg-app)]">
              <tr>
                <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)]">Date</th>
                <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)]">Type</th>
                <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Price</th>
                <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Quantity</th>
                <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Total</th>
                <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {/* show transactions or empty message */}
              {asset.transactions && asset.transactions.length > 0 ? (
                asset.transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="py-4 px-6 text-sm text-white/90">{formatDateTime(tx.date)}</td>
                    {/* buy/sell badge */}
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                        tx.type === 'Buy' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-sm font-medium">{formatCurrency(tx.price)}</td>
                    <td className="py-4 px-6 text-right text-sm text-[var(--text-secondary)]">
                      {tx.quantity} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
                    </td>
                    <td className="py-4 px-6 text-right text-sm font-medium">{formatCurrency(tx.quantity * tx.price)}</td>
                    {/* edit button */}
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => openEditModal(tx)}
                        disabled={updateTransaction.isPending}
                        className="p-1 text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50"
                        title="Edit transaction"
                      >
                        <PencilSimpleIcon size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-[var(--text-secondary)]">
                    No transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
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
              ? handleUpdateTransaction
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
