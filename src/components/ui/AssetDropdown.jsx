// reusable asset dropdown component for ticker autocomplete
// used in TransactionFormModal for both popular and search results

import React from 'react';
import { getStockLogo } from '../../services/api';

export default function AssetDropdown({ 
  assets, 
  onSelect, 
  title = null
}) {
  if (!assets || assets.length === 0) return null;

  return (
    <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
      {title && (
        <li className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] border-b border-[var(--border-subtle)] bg-[var(--bg-app)] sticky top-0">
          {title}
        </li>
      )}
      {assets.map((asset) => (
        <AssetDropdownItem 
          key={asset.ticker} 
          asset={asset} 
          onSelect={onSelect} 
        />
      ))}
    </ul>
  );
}

// individual dropdown item component
function AssetDropdownItem({ asset, onSelect }) {
  // stocks use generated logo, crypto uses provided logo
  const logo = asset.type === "Stock" ? getStockLogo(asset.ticker) : asset.logo;
  
  return (
    <li
      onClick={() => onSelect(asset)}
      className="px-4 py-3 hover:bg-[var(--bg-card-hover)] cursor-pointer flex justify-between items-center group border-b border-[var(--border-subtle)] last:border-0"
    >
      <div className="flex items-center gap-3">
        {logo && (
          <img src={logo} alt="" className="w-6 h-6 rounded-full" />
        )}
        <div>
          <span className="font-bold text-white text-sm block">
            {asset.ticker}
          </span>
          <span className="text-xs text-[var(--text-secondary)] group-hover:text-white transition-colors">
            {asset.name}
          </span>
        </div>
      </div>
      <span className="text-xs bg-[var(--bg-app)] px-2 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-subtle)]">
        {asset.type}
      </span>
    </li>
  );
}

