// reusable filter buttons component
// used in Dashboard for filtering by asset type (All/Stock/Crypto)

import React from 'react';

export default function FilterButtons({ options, activeFilter, onFilterChange, labelMap = {} }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1 rounded-lg flex items-center gap-1 w-fit">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onFilterChange(option)}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
            activeFilter === option
              ? 'bg-[var(--border-highlight)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          {labelMap[option] || option}
        </button>
      ))}
    </div>
  );
}

