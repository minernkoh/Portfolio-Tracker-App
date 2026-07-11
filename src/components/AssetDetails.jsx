// asset details page - shows individual asset info and transaction history

import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, CaretUp, CaretDown } from '@phosphor-icons/react';
import { formatCurrency, formatQuantity, formatQuantity4SF, calculatePortfolioData, formatDateTime, truncateName, calculatePnLPercentage, format24hChange, formatPrice, transactionSortComparator } from '../services/utils';
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
  const { handleSort, sortData, getSortDirection } = useSort({ key: 'date', direction: 'desc' });
  
  const sortedTransactions = useMemo(() => {
    if (!asset?.transactions) return [];
    return sortData(asset.transactions, transactionSortComparator);
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
          <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors">
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
          <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
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
                <h1 className="text-xl font-bold text-[var(--text-primary)]" title={asset.name}>{truncateName(asset.name, 50)}</h1>
                <p className="text-sm text-[var(--text-secondary)]">{asset.ticker} • {asset.assetType}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[var(--text-primary)]">{formatPrice(asset.currentPrice)}</div>
              <div className={`flex items-center gap-1 justify-end ${change24h.isPositive ? 'text-green' : 'text-red'}`}>
                {change24h.isPositive ? <CaretUp size={14} weight="fill" /> : <CaretDown size={14} weight="fill" />}
                <span className="text-sm font-bold">{change24h.formatted}%</span>
              </div>
            </div>
          </div>
          
          {/* stats grid */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Holdings</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {formatQuantity(asset.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : asset.assetType === 'Commodity' ? 'oz' : 'shares'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Market Value</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(asset.totalValue)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Cost Basis</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(asset.totalCost)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Avg Price</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{formatPrice(asset.avgPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Profit/Loss</div>
              <div className={`text-sm font-bold ${isProfitable ? 'text-green' : 'text-red'}`}>
                {isProfitable ? '+' : ''}{formatCurrency(asset.pnl)}
                <span className="text-xs ml-1">({isProfitable ? '+' : ''}{Math.abs(parseFloat(pnlPercent)).toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* transaction history */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Transaction History</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {asset.transactions?.length || 0} {asset.transactions?.length === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
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
                      className={`py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                        {col.label}
                        {getSortDirection(col.key) && (
                          getSortDirection(col.key) === 'asc' ? (
                            <CaretUp size={12} weight="fill" className="text-[var(--text-primary)]" />
                          ) : (
                            <CaretDown size={12} weight="fill" className="text-[var(--text-primary)]" />
                          )
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sortedTransactions.length > 0 ? (
                  sortedTransactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-4 px-6 text-sm text-[var(--text-primary)]">{formatDateTime(tx.date, tx.time)}</td>
                      <td className="py-4 px-6"><TransactionTypeBadge type={tx.type} /></td>
                      <td className="py-4 px-6 text-right text-sm text-[var(--text-primary)]">{formatPrice(tx.price)}</td>
                      <td className="py-4 px-6 text-right text-sm text-[var(--text-primary)]">
                        {asset.assetType === 'Crypto' ? formatQuantity(tx.quantity) : formatQuantity4SF(tx.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : asset.assetType === 'Commodity' ? 'oz' : 'shares'}
                      </td>
                      <td className="py-4 px-6 text-right text-sm text-[var(--text-primary)]">{formatCurrency(tx.quantity * tx.price)}</td>
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
