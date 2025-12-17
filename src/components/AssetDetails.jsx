// asset details page - shows individual asset info and transaction history

import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, TrendUpIcon, TrendDownIcon } from '@phosphor-icons/react';
import { formatCurrency, formatQuantity, calculatePortfolioData, formatDateTime, truncateName, calculatePnLPercentage, format24hChange } from '../services/utils';
import AssetLogo from './ui/AssetLogo';
import Layout from './Layout';
import TransactionFormModal from './TransactionFormModal';
import AddTransactionButton from './ui/AddTransactionButton';
import LoadingState from './ui/LoadingState';
import TransactionTypeBadge from './ui/TransactionTypeBadge';
import EditButton from './ui/EditButton';
import EmptyState from './ui/EmptyState';
import { useTransactions, usePrices } from '../hooks/usePortfolio';
import { useTransactionModal } from '../hooks/useTransactionModal';

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
  } = useTransactionModal(portfolioData);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
            <ArrowLeftIcon size={20} /> Back to Dashboard
          </Link>
          <AddTransactionButton onClick={handleOpenAddModal} disabled={isPending} />
        </div>
        
        {/* Asset Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <AssetLogo logo={asset.logo} ticker={asset.ticker} name={asset.name} size={16} />
              <div>
                <h1 className="text-2xl font-bold text-white" title={asset.name}>{truncateName(asset.name, 50)}</h1>
                <p className="text-[var(--text-secondary)]">{asset.ticker} • {asset.assetType}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{formatCurrency(asset.currentPrice)}</div>
              <div className={`flex items-center gap-1 justify-end mt-1 ${change24h.isPositive ? 'text-green' : 'text-red'}`}>
                {change24h.isPositive ? <TrendUpIcon size={16} /> : <TrendDownIcon size={16} />}
                <span className="text-sm font-bold">{change24h.formatted}%</span>
              </div>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-1">Holdings</div>
              <div className="text-lg font-bold text-white">
                {formatQuantity(asset.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-1">Market value</div>
              <div className="text-lg font-bold text-white">{formatCurrency(asset.totalValue)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-1">Avg price</div>
              <div className="text-lg font-bold text-white">{formatCurrency(asset.avgPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-1">Profit/loss</div>
              <div className={`text-lg font-bold ${isProfitable ? 'text-green' : 'text-red'}`}>
                {isProfitable ? '+' : ''}{formatCurrency(asset.pnl)}
                <span className="text-xs ml-1">({isProfitable ? '+' : ''}{pnlPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
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
                <tr>
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)]">Date</th>
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)]">Type</th>
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Price</th>
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Quantity</th>
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Total Cost</th>
                  <th className="py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {asset.transactions?.length > 0 ? (
                  asset.transactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-4 px-6 text-sm text-white/90">{formatDateTime(tx.date, tx.time)}</td>
                      <td className="py-4 px-6"><TransactionTypeBadge type={tx.type} /></td>
                      <td className="py-4 px-6 text-right text-sm font-medium">{formatCurrency(tx.price)}</td>
                      <td className="py-4 px-6 text-right text-sm text-[var(--text-secondary)]">
                        {formatQuantity(tx.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
                      </td>
                      <td className="py-4 px-6 text-right text-sm font-medium">{formatCurrency(tx.quantity * tx.price)}</td>
                      <td className="py-4 px-6 text-right">
                        <EditButton onClick={() => openEditModal(tx)} disabled={isPending} />
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
