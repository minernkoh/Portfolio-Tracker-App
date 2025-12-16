// this component displays all your assets in a table
// it shows each asset's current price, value, profit/loss, etc.

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, DotsThreeIcon, TrashIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import { formatCurrency, formatQuantity, truncateName, calculatePnLPercentage, format24hChange } from '../services/utils';
import AssetLogo from './ui/AssetLogo';

export default function PortfolioTable({ data, hideValues, onDeleteAsset, onAddTransaction }) {
  // state for dropdown menu (the three dots menu)
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // state for table sorting (which column and direction)
  const [sortConfig, setSortConfig] = useState({ key: 'totalValue', direction: 'desc' });
  
  // reference to dropdown element (for detecting clicks outside)
  const dropdownRef = useRef(null);

  // close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // toggle dropdown menu open/closed
  const handleDropdownToggle = (e, id) => {
      e.stopPropagation(); // prevent event from bubbling up
      setOpenDropdownId(openDropdownId === id ? null : id);
  };

  // handle column header click for sorting
  const handleSort = (key) => {
      let direction = 'asc'; // default to ascending
      // if clicking same column, toggle direction
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  // show sort arrow indicator in column header
  const renderSortArrow = (key) => {
      if (sortConfig.key === key) {
          return <span className="text-white text-[10px] ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
      }
      return null;
  };

  // sort the data based on current sort configuration
  const sortedData = [...data].sort((a, b) => {
      // sort numeric values (prices, values, percentages)
      const numericKeys = ['currentPrice', 'priceChange24h', 'totalValue', 'pnl', 'avgPrice'];
      if(numericKeys.includes(sortConfig.key)) {
          // handle null/undefined values for 7d and 30d changes (stocks don't have these)
          const valA = a[sortConfig.key] ?? -Infinity;
          const valB = b[sortConfig.key] ?? -Infinity;
          return sortConfig.direction === 'asc' 
             ? valA - valB
             : valB - valA;
      }
      // sort string values (ticker/name alphabetically)
      if(sortConfig.key === 'ticker') {
          const strA = a.ticker.toLowerCase();
          const strB = b.ticker.toLowerCase();
          if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      }
      return 0;
  });

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-visible">
      <div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] cursor-pointer select-none">
              {/* clickable column headers for sorting */}
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-colors" onClick={() => handleSort('ticker')}>
                  <div className="flex items-center gap-1">Name {renderSortArrow('ticker')}</div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white transition-colors" onClick={() => handleSort('currentPrice')}>
                  <div className="flex items-center justify-end gap-1">Price {renderSortArrow('currentPrice')}</div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white transition-colors" onClick={() => handleSort('priceChange24h')}>
                  <div className="flex items-center justify-end gap-1">24h% {renderSortArrow('priceChange24h')}</div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white transition-colors" onClick={() => handleSort('totalValue')}>
                  <div className="flex items-center justify-end gap-1">Market Value {renderSortArrow('totalValue')}</div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white transition-colors" onClick={() => handleSort('avgPrice')}>
                  <div className="flex items-center justify-end gap-1">Avg. Price {renderSortArrow('avgPrice')}</div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white transition-colors" onClick={() => handleSort('pnl')}>
                  <div className="flex items-center justify-end gap-1">Profit/Loss {renderSortArrow('pnl')}</div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {/* show message if no assets */}
            {sortedData.length === 0 ? (
                 <tr>
                    <td colSpan="7" className="py-12 text-center text-[var(--text-secondary)]">
                        No assets in portfolio. Add a transaction to get started.
                    </td>
                 </tr>
            ) : sortedData.map((asset) => (
              <tr 
                key={asset.id} 
                className="group hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                {/* asset name and logo */}
                <td className="py-4 px-6">
                  <Link 
                    to={`/asset/${asset.ticker}`}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <AssetLogo logo={asset.logo} ticker={asset.ticker} name={asset.name} size={8} />
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">
                        {asset.ticker} <span className="mx-1 text-[var(--text-secondary)]">|</span> <span className="text-[var(--text-secondary)] font-normal" title={asset.name}>{truncateName(asset.name, 25)}</span>
                      </div>
                    </div>
                  </Link>
                </td>
                
                {/* current price */}
                <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
                  {formatCurrency(asset.currentPrice, hideValues)}
                </td>

                {/* 24 hour price change percentage */}
                {(() => {
                  const change24h = format24hChange(asset.priceChange24h);
                  return (
                    <td className={`py-4 px-6 text-right text-sm font-medium ${change24h.isPositive ? 'text-green' : 'text-red'}`}>
                      {change24h.display}
                    </td>
                  );
                })()}

                {/* total market value */}
                <td className="py-4 px-6 text-right">
                  <div className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(asset.totalValue, hideValues)}</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatQuantity(asset.quantity)} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
                  </div>
                </td>

                {/* average buy price */}
                <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
                   {formatCurrency(asset.avgPrice, hideValues)}
                </td>

                {/* profit/loss */}
                <td className="py-4 px-6 text-right">
                   <div className={`text-sm font-bold ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                     {asset.pnl > 0 ? '+' : ''}{formatCurrency(asset.pnl, hideValues)}
                   </div>
                   <div className={`text-xs ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                     {asset.pnl >= 0 ? '▲' : '▼'} {(() => {
                       const costBasis = asset.totalValue - asset.pnl;
                       return calculatePnLPercentage(asset.pnl, costBasis);
                     })()}%
                   </div>
                </td>
                
                {/* action buttons */}
                <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="relative flex items-center justify-end gap-1">
                    {/* quick add transaction button */}
                    <button
                        className="hover:text-white p-1 text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] rounded-md transition-colors"
                        onClick={(e) => { e.stopPropagation(); onAddTransaction(asset.ticker); }}
                        title="Add transaction"
                    >
                        <PlusIcon size={20} weight="bold" />
                    </button>
                    
                    {/* dropdown menu button */}
                    <button 
                      className="hover:text-blue-400 p-1 text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] rounded-md transition-colors" 
                      onClick={(e) => handleDropdownToggle(e, asset.id)}
                      title="actions"
                    >
                      <DotsThreeIcon size={24} weight="bold" />
                    </button>

                    {/* dropdown menu */}
                    {openDropdownId === asset.id && (
                        <div 
                            ref={dropdownRef}
                            className="absolute right-0 top-8 z-50 w-48 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl animate-fade-in overflow-visible"
                        >
                            <div className="py-1">
                                {/* view history link */}
                                <Link
                                    to={`/asset/${asset.ticker}`}
                                    onClick={() => setOpenDropdownId(null)}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] flex items-center gap-2"
                                >
                                    <ClockCounterClockwiseIcon size={16} /> View history
                                </Link>
                                {/* delete asset button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset.ticker); setOpenDropdownId(null); }}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
