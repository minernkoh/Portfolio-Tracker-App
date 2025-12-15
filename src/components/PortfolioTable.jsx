// this component displays all your assets in a table
// it shows each asset's current price, value, profit/loss, etc.

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, DotsThreeIcon, TrashIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import { formatCurrency } from '../services/utils';

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
          return sortConfig.direction === 'asc' 
             ? a[sortConfig.key] - b[sortConfig.key]
             : b[sortConfig.key] - a[sortConfig.key];
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
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="overflow-x-auto pb-32">
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
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white transition-colors" onClick={() => handleSort('pnl')}>
                  <div className="flex items-center justify-end gap-1">Profit/loss {renderSortArrow('pnl')}</div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-[var(--text-secondary)] text-right hover:text-white transition-colors" onClick={() => handleSort('avgPrice')}>
                  <div className="flex items-center justify-end gap-1">Avg.price {renderSortArrow('avgPrice')}</div>
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
                    {asset.logo ? (
                        <img 
                          src={asset.logo} 
                          alt={asset.name} 
                          className="w-8 h-8 rounded-full bg-transparent object-cover"
                          onError={(e) => {
                              // if logo fails to load, show fallback avatar
                              e.target.onerror = null; 
                              e.target.src = `https://ui-avatars.com/api/?name=${asset.ticker}&background=random`
                          }} 
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                          {asset.ticker[0]}
                        </div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">
                        {asset.ticker} <span className="mx-1 text-[var(--text-secondary)]">|</span> <span className="text-[var(--text-secondary)] font-normal">{asset.name}</span>
                      </div>
                    </div>
                  </Link>
                </td>
                
                {/* current price */}
                <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
                  {formatCurrency(asset.currentPrice, hideValues)}
                </td>

                {/* 24 hour price change percentage */}
                <td className={`py-4 px-6 text-right text-sm font-medium ${asset.priceChange24h >= 0 ? 'text-green' : 'text-red'}`}>
                   {asset.priceChange24h >= 0 ? '▲' : '▼'} {Math.abs(asset.priceChange24h).toFixed(2)}%
                </td>

                {/* total market value */}
                <td className="py-4 px-6 text-right">
                  <div className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(asset.totalValue, hideValues)}</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {asset.quantity} {asset.assetType === 'Crypto' ? asset.ticker : 'shares'}
                  </div>
                </td>

                {/* profit/loss */}
                <td className="py-4 px-6 text-right">
                   <div className={`text-sm font-bold ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                     {asset.pnl > 0 ? '+' : ''}{formatCurrency(asset.pnl, hideValues)}
                   </div>
                   <div className={`text-xs ${asset.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                     {asset.pnl >= 0 ? '▲' : '▼'} {asset.totalValue > asset.pnl ? ((asset.pnl / (asset.totalValue - asset.pnl)) * 100).toFixed(2) : 0}%
                   </div>
                </td>

                {/* average buy price */}
                <td className="py-4 px-6 text-right text-sm font-medium text-[var(--text-primary)]">
                   {formatCurrency(asset.avgPrice, hideValues)}
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
                            className="absolute right-0 top-8 z-50 w-48 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl animate-fade-in"
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
