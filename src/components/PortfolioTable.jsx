// portfolio assets table with sorting and actions

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, DotsThreeIcon, TrashIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import { formatCurrency, formatQuantity, truncateName, calculatePnLPercentage, format24hChange } from '../services/utils';
import AssetLogo from './ui/AssetLogo';
import { useSort } from '../hooks/useSort';
import { useClickOutside } from '../hooks/useClickOutside';

// table column configuration
const COLUMNS = [
  { key: 'ticker', label: 'Name', align: 'left' },
  { key: 'currentPrice', label: 'Price', align: 'right' },
  { key: 'priceChange24h', label: '24h%', align: 'right' },
  { key: 'totalValue', label: 'Market Value', align: 'right' },
  { key: 'avgPrice', label: 'Avg. Price', align: 'right' },
  { key: 'pnl', label: 'Profit/Loss', align: 'right' },
];

export default function PortfolioTable({ data, hideValues, onDeleteAsset, onAddTransaction }) {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  const { sortConfig, handleSort, renderSortArrow, sortData } = useSort({ 
    key: 'totalValue', 
    direction: 'desc' 
  });
  
  const dropdownRef = useClickOutside(useCallback(() => setOpenDropdownId(null), []));

  const handleDropdownToggle = (e, id) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  // sort data with custom comparator
  const sortedData = sortData(data, (a, b, key, direction) => {
    const numericKeys = ['currentPrice', 'priceChange24h', 'totalValue', 'pnl', 'avgPrice'];
    if (numericKeys.includes(key)) {
      const valA = a[key] ?? -Infinity;
      const valB = b[key] ?? -Infinity;
      return direction === 'asc' ? valA - valB : valB - valA;
    }
    if (key === 'ticker') {
      const strA = a.ticker.toLowerCase();
      const strB = b.ticker.toLowerCase();
      return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] cursor-pointer select-none">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-colors ${
                    col.align === 'right' ? 'text-right' : ''
                  }`}
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
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-[var(--text-secondary)]">
                  No assets in portfolio. Add a transaction to get started.
                </td>
              </tr>
            ) : (
              sortedData.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  hideValues={hideValues}
                  isDropdownOpen={openDropdownId === asset.id}
                  onDropdownToggle={handleDropdownToggle}
                  onAddTransaction={onAddTransaction}
                  onDeleteAsset={onDeleteAsset}
                  closeDropdown={() => setOpenDropdownId(null)}
                  dropdownRef={openDropdownId === asset.id ? dropdownRef : null}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// extracted row component for cleaner code
function AssetRow({ 
  asset, 
  hideValues, 
  isDropdownOpen, 
  onDropdownToggle, 
  onAddTransaction, 
  onDeleteAsset, 
  closeDropdown,
  dropdownRef 
}) {
  const change24h = format24hChange(asset.priceChange24h);
  const costBasis = asset.totalValue - asset.pnl;
  const pnlPercent = calculatePnLPercentage(asset.pnl, costBasis);

  return (
    <tr className="group hover:bg-[var(--bg-card-hover)] transition-colors">
      {/* Asset name and logo */}
      <td className="py-4 px-6">
        <Link 
          to={`/asset/${asset.ticker}`}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <AssetLogo logo={asset.logo} ticker={asset.ticker} name={asset.name} size={8} />
          <div className="font-bold text-sm text-[var(--text-primary)]">
            {asset.ticker}
            <span className="mx-1 text-[var(--text-secondary)]">|</span>
            <span className="text-[var(--text-secondary)] font-normal" title={asset.name}>
              {truncateName(asset.name, 25)}
            </span>
          </div>
        </Link>
      </td>
      
      {/* Current price */}
      <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
        {formatCurrency(asset.currentPrice, hideValues)}
      </td>

      {/* 24h change */}
      <td className={`py-4 px-6 text-right text-sm font-medium ${change24h.isPositive ? 'text-green' : 'text-red'}`}>
        {change24h.display}
      </td>

      {/* Market value */}
      <td className="py-4 px-6 text-right">
        <div className="text-sm font-bold text-[var(--text-primary)]">
          {formatCurrency(asset.totalValue, hideValues)}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {formatQuantity(asset.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
        </div>
      </td>

      {/* Average price */}
      <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
        {formatCurrency(asset.avgPrice, hideValues)}
      </td>

      {/* Profit/Loss */}
      <td className="py-4 px-6 text-right">
        <div className={`text-sm font-bold ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
          {asset.pnl > 0 ? '+' : ''}{formatCurrency(asset.pnl, hideValues)}
        </div>
        <div className={`text-xs ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
          {asset.pnl >= 0 ? '▲' : '▼'} {pnlPercent}%
        </div>
      </td>
      
      {/* Actions */}
      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex items-center justify-end gap-1">
          <button
            className="hover:text-white p-1 text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] rounded-md transition-colors"
            onClick={(e) => { e.stopPropagation(); onAddTransaction(asset.ticker); }}
            title="Add transaction"
          >
            <PlusIcon size={20} weight="bold" />
          </button>
          
          <button 
            className="hover:text-blue-400 p-1 text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] rounded-md transition-colors" 
            onClick={(e) => onDropdownToggle(e, asset.id)}
            title="Actions"
          >
            <DotsThreeIcon size={24} weight="bold" />
          </button>

          {isDropdownOpen && (
            <div 
              ref={dropdownRef}
              className="absolute right-0 top-8 z-50 w-48 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl animate-fade-in"
            >
              <div className="py-1">
                <Link
                  to={`/asset/${asset.ticker}`}
                  onClick={closeDropdown}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] flex items-center gap-2"
                >
                  <ClockCounterClockwiseIcon size={16} /> View history
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset.ticker); closeDropdown(); }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--accent-danger)] hover:bg-[var(--bg-card-hover)] flex items-center gap-2 border-t border-[var(--border-subtle)]"
                >
                  <TrashIcon size={16} /> Remove asset
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
