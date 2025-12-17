// asset details page - shows individual asset info and transaction history

import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, TrendUpIcon, TrendDownIcon } from '@phosphor-icons/react';
import { formatCurrency, formatQuantity, calculatePortfolioData, formatDateTime, truncateName, calculatePnLPercentage, format24hChange } from '../services/utils';
import AssetLogo from './ui/AssetLogo';
import Layout from './Layout';
import TransactionFormModal from './TransactionFormModal';
import Button from './ui/Button';
import LoadingState from './ui/LoadingState';
import TransactionTypeBadge from './ui/TransactionTypeBadge';
import IconButton from './ui/IconButton';
import EmptyState from './ui/EmptyState';
import { useTransactions, usePrices, useDeleteTransaction } from '../hooks/usePortfolio';
import { useTransactionModal } from '../hooks/useTransactionModal';
import { useSort } from '../hooks/useSort';

export default function AssetDetails() {
  const { ticker } = useParams();
  
  // data fetching
  const { data: transactions = [], isLoading } = useTransactions();
  const { prices } = usePrices(transactions);
  
  // calculate portfolio data
  const portfolioData = useMemo(() => calculatePortfolioData(transactions, prices), [transactions, prices]);
  const asset = portfolioData.find(a => a.ticker === ticker);
  
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

  // delete transaction mutation
  const deleteTransactionMutation = useDeleteTransaction();
  
  // sorting for transaction history table
  const { sortConfig, handleSort, sortData, renderSortArrow } = useSort({ key: 'date', direction: 'desc' });
  
  // sorted transactions
  const sortedTransactions = useMemo(() => {
    if (!asset?.transactions) return [];
    return sortData(asset.transactions, (a, b, key, direction) => {
      if (key === 'date') {
        // combine date and time for accurate sorting
        const dateTimeA = a.time ? `${a.date}T${a.time}` : a.date;
        const dateTimeB = b.time ? `${b.date}T${b.time}` : b.date;
        const dateComparison = new Date(dateTimeA) - new Date(dateTimeB);
        
        // if dates are equal, use secondary sort by type
        // for descending (newest first): Sells before Buys (reverse of FIFO)
        // for ascending (oldest first): Buys before Sells (FIFO order)
        if (dateComparison === 0) {
          const typeA = a.type?.toLowerCase() === 'buy' ? 0 : 1;
          const typeB = b.type?.toLowerCase() === 'buy' ? 0 : 1;
          return direction === 'asc' ? typeA - typeB : typeB - typeA;
        }
        
        return direction === 'asc' ? dateComparison : -dateComparison;
      }
      if (key === 'total') {
        const valA = a.quantity * a.price;
        const valB = b.quantity * b.price;
        return direction === 'asc' ? valA - valB : valB - valA;
      }
      if (['quantity', 'price'].includes(key)) {
        return direction === 'asc' ? Number(a[key]) - Number(b[key]) : Number(b[key]) - Number(a[key]);
      }
      const strA = String(a[key]).toLowerCase();
      const strB = String(b[key]).toLowerCase();
      return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [asset?.transactions, sortData]);
  
  // handle delete with confirmation
  const handleDeleteTransaction = (tx) => {
    if (window.confirm(`Delete this ${tx.type.toLowerCase()} transaction for ${tx.quantity} ${asset.ticker}?`)) {
      deleteTransactionMutation.mutate(tx.id);
    }
  };

  // open add modal with asset pre-filled
  const handleOpenAddModal = () => {
    if (asset) {
      openAddModal({
        ticker: asset.ticker,
        name: asset.name,
        assetType: asset.assetType,
        logo: asset.logo,
      });
    } else {
      openAddModal({ ticker });
    }
  };
  
  if (isLoading) return <LoadingState />;
  
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

  const isProfitable = asset.pnl >= 0;
  const pnlPercent = calculatePnLPercentage(asset.pnl, asset.totalCost);
  const change24h = format24hChange(asset.priceChange24h);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-10 animate-fade-in">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
            <ArrowLeftIcon size={20} /> Back to Dashboard
          </Link>
          <Button icon="plus" onClick={handleOpenAddModal} disabled={isPending}>Add Transaction</Button>
        </div>
        
        {/* asset card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AssetLogo logo={asset.logo} ticker={asset.ticker} name={asset.name} size={12} />
              <div>
                <h1 className="text-xl font-bold text-white" title={asset.name}>{truncateName(asset.name, 50)}</h1>
                <p className="text-sm text-[var(--text-secondary)]">{asset.ticker} • {asset.assetType}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white">{formatCurrency(asset.currentPrice)}</div>
              <div className={`flex items-center gap-1 justify-end ${change24h.isPositive ? 'text-green' : 'text-red'}`}>
                {change24h.isPositive ? <TrendUpIcon size={14} /> : <TrendDownIcon size={14} />}
                <span className="text-sm font-bold">{change24h.formatted}%</span>
              </div>
            </div>
          </div>
          
          {/* stats grid */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Holdings</div>
              <div className="text-sm font-bold text-white">
                {formatQuantity(asset.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Market Value</div>
              <div className="text-sm font-bold text-white">{formatCurrency(asset.totalValue)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Cost Basis</div>
              <div className="text-sm font-bold text-white">{formatCurrency(asset.totalCost)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Avg Price</div>
              <div className="text-sm font-bold text-white">{formatCurrency(asset.avgPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Profit/Loss</div>
              <div className={`text-sm font-bold ${isProfitable ? 'text-green' : 'text-red'}`}>
                {isProfitable ? '+' : ''}{formatCurrency(asset.pnl)}
                <span className="text-xs ml-1">({isProfitable ? '+' : ''}{pnlPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* transaction history */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h2 className="text-lg font-bold text-white">Transaction History</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {asset.transactions?.length || 0} {asset.transactions?.length === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--bg-app)]">
                <tr className="cursor-pointer select-none">
                  {[
                    { key: 'date', label: 'Date', align: 'left' },
                    { key: 'type', label: 'Type', align: 'left' },
                    { key: 'price', label: 'Price', align: 'right' },
                    { key: 'quantity', label: 'Quantity', align: 'right' },
                    { key: 'total', label: 'Cost', align: 'right' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                        {col.label}
                        {renderSortArrow(col.key) && (
                          <span className="text-white text-[10px] ml-1">{renderSortArrow(col.key)}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sortedTransactions.length > 0 ? (
                  sortedTransactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-4 px-6 text-sm text-white">{formatDateTime(tx.date, tx.time)}</td>
                      <td className="py-4 px-6"><TransactionTypeBadge type={tx.type} /></td>
                      <td className="py-4 px-6 text-right text-sm text-white">{formatCurrency(tx.price)}</td>
                      <td className="py-4 px-6 text-right text-sm text-white">
                        {formatQuantity(tx.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
                      </td>
                      <td className="py-4 px-6 text-right text-sm text-white">{formatCurrency(tx.quantity * tx.price)}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton variant="edit" onClick={() => openEditModal(tx)} disabled={isPending || deleteTransactionMutation.isPending} />
                          <IconButton variant="delete" onClick={() => handleDeleteTransaction(tx)} disabled={isPending || deleteTransactionMutation.isPending} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState message="No transactions recorded." colSpan={6} />
                )}
              </tbody>
            </table>
          </div>
        </div>
        
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
