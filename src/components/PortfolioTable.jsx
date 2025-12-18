// portfolio assets table with sorting and actions

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { TrashIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import IconButton from './ui/IconButton';
import { formatCurrency, formatQuantity, truncateName, calculatePnLPercentage, format24hChange } from '../services/utils';
import AssetLogo from './ui/AssetLogo';
import EmptyState from './ui/EmptyState';
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
  
  // sorting hook for assets table (default: sort by total value descending)
  const { handleSort, renderSortArrow, sortData } = useSort({ 
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
        <table className="w-full text-left border-collapse" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr className="border-b border-[var(--border-subtle)] cursor-pointer select-none">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-colors ${
                    col.align === 'right' ? 'text-right' : ''
                  } ${col.key === 'totalValue' ? 'min-w-[140px] whitespace-nowrap' : ''}`}
                  style={col.key === 'totalValue' ? { minWidth: '140px' } : {}}
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
              <EmptyState message="No assets in portfolio. Add a transaction to get started." colSpan={7} />
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
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // calculate dropdown position when it opens
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap (equivalent to top-8)
        right: window.innerWidth - rect.right,
      });
    }
  }, [isDropdownOpen]);

  return (
    <tr className="group hover:bg-[var(--bg-card-hover)] transition-colors">
      {/* asset name and logo */}
      <td className="py-4 px-6">
        <Link 
          to={`/asset/${asset.ticker}`}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <AssetLogo logo={asset.logo} ticker={asset.ticker} name={asset.name} size={8} />
          <div className="font-bold text-sm text-[var(--text-primary)] min-w-0">
            <div className="truncate">
              {asset.ticker}
              <span className="mx-1 text-[var(--text-secondary)]">|</span>
              <span className="text-[var(--text-secondary)] font-normal" title={asset.name}>
                {truncateName(asset.name, 15)}
              </span>
            </div>
          </div>
        </Link>
      </td>
      
      {/* current price */}
      <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
        {formatCurrency(asset.currentPrice, hideValues)}
      </td>

      {/* 24h change */}
      <td className={`py-4 px-6 text-right text-sm font-medium whitespace-nowrap ${change24h.isPositive ? 'text-green' : 'text-red'}`}>
        {change24h.display}
      </td>

      {/* market value */}
      <td className="py-4 px-6 text-right" style={{ minWidth: '140px' }}>
        <div className="text-sm font-bold text-[var(--text-primary)]" style={{ whiteSpace: 'nowrap' }}>
          {formatCurrency(asset.totalValue, hideValues)}
        </div>
        <div className="text-xs text-[var(--text-secondary)]" style={{ whiteSpace: 'nowrap' }}>
          {formatQuantity(asset.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
        </div>
      </td>

      {/* average price */}
      <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
        {formatCurrency(asset.avgPrice, hideValues)}
      </td>

      {/* profit/loss */}
      <td className="py-4 px-6 text-right">
        <div className={`text-sm font-bold ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
          {asset.pnl > 0 ? '+' : ''}{formatCurrency(asset.pnl, hideValues)}
        </div>
        <div className={`text-xs ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
          {asset.pnl >= 0 ? '▲' : '▼'} {pnlPercent}%
        </div>
      </td>
      
      {/* actions */}
      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex items-center justify-end gap-1">
          <IconButton
            variant="add"
            size={20}
            onClick={(e) => { e.stopPropagation(); onAddTransaction(asset.ticker); }}
            title="Add transaction"
          />
          <div ref={buttonRef}>
            <IconButton
              variant="more"
              size={24}
              onClick={(e) => onDropdownToggle(e, asset.id)}
              title="Actions"
            />
          </div>

          {isDropdownOpen && createPortal(
            <div 
              ref={dropdownRef}
              className="fixed z-50 w-48 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl animate-fade-in max-h-64 overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
              }}
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
            </div>,
            document.body
          )}
        </div>
      </td>
    </tr>
  );
}
