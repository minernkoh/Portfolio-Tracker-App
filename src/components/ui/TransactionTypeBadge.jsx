// reusable badge component for displaying Buy/Sell transaction types
// used in Dashboard and AssetDetails transaction tables

import React from 'react';

export default function TransactionTypeBadge({ type, variant = 'default' }) {
  // variant can be 'default' (for AssetDetails) or 'compact' (for Dashboard)
  const isBuy = type === 'Buy' || type === 'buy';
  
  if (variant === 'compact') {
    // Compact style used in Dashboard transactions table
    return (
      <span
        className={`text-xs font-bold px-2 py-1 rounded ${
          isBuy
            ? 'text-green bg-green-900/20'
            : 'text-red bg-red-900/20'
        }`}
      >
        {type}
      </span>
    );
  }
  
  // Default style used in AssetDetails
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
        isBuy
          ? 'bg-green-500/10 text-green-500 border-green-500/20'
          : 'bg-red-500/10 text-red-500 border-red-500/20'
      }`}
    >
      {type}
    </span>
  );
}

