// reusable toggle button group component
// used for Buy/Sell toggles and Stock/Crypto asset type selection

import React from 'react';

export default function ToggleButtonGroup({
  options,
  value,
  onChange,
  error,
  disabled = false,
  className = '',
}) {
  return (
    <div className={className}>
      <div className={`flex gap-2 p-1 bg-[var(--bg-app)] rounded-lg border ${
        error ? 'border-red-500' : 'border-[var(--border-subtle)]'
      }`}>
        {options.map((option) => {
          const isActive = value === option.value;
          const isDisabled = disabled || option.disabled;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                isActive
                  ? `${option.activeClass || 'bg-[var(--accent-blue)] text-white'} shadow-lg`
                  : isDisabled
                  ? 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

