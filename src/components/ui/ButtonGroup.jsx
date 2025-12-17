// unified button group component with variants
// consolidates filter buttons, tab switcher, and toggle button group

import React from 'react';

const VARIANT_STYLES = {
  // pills variant - used for asset type filters (All/Stock/Crypto)
  pills: {
    container: 'bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1 rounded-lg flex items-center gap-1 w-fit',
    button: 'px-3 py-1 text-xs font-bold rounded-md transition-all',
    active: 'bg-[var(--border-highlight)] text-white shadow-sm',
    inactive: 'text-[var(--text-secondary)] hover:text-white',
  },
  // tabs variant - used for overview/transactions tabs
  tabs: {
    container: 'flex gap-4 border-b border-[var(--border-subtle)] w-fit',
    button: 'pb-2 text-sm font-bold transition-all border-b-2',
    active: 'border-[var(--accent-blue)] text-white',
    inactive: 'border-transparent text-[var(--text-secondary)] hover:text-white',
  },
  // toggle variant - used for buy/sell and stock/crypto toggles in forms
  toggle: {
    container: 'flex gap-2 p-1 bg-[var(--bg-app)] rounded-lg border',
    button: 'flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all',
    active: 'bg-[var(--accent-blue)] text-white shadow-lg',
    inactive: 'text-[var(--text-secondary)] hover:text-white',
    disabled: 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed',
  },
};

export default function ButtonGroup({
  variant = 'pills',
  options,
  value,
  onChange,
  labelMap = {},
  error,
  disabled = false,
  className = '',
}) {
  const styles = VARIANT_STYLES[variant];
  
  if (!styles) {
    console.warn(`ButtonGroup: unknown variant "${variant}"`);
    return null;
  }

  // normalize options to consistent format { value, label, activeClass?, disabled? }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: labelMap[opt] || opt };
    }
    // handle TabSwitcher format { id, label }
    if (opt.id !== undefined) {
      return { value: opt.id, label: opt.label };
    }
    return opt;
  });

  const containerClass = variant === 'toggle' && error
    ? `${styles.container} border-red-500`
    : `${styles.container} ${variant === 'toggle' ? 'border-[var(--border-subtle)]' : ''}`;

  return (
    <div className={className}>
      <div className={containerClass}>
        {normalizedOptions.map((option) => {
          const isActive = value === option.value;
          const isDisabled = disabled || option.disabled;
          
          // determine button classes based on state
          let buttonClass = styles.button;
          
          if (isActive) {
            if (variant === 'toggle' && option.activeClass) {
              buttonClass += ` ${option.activeClass}`;
            } else {
              buttonClass += ` ${styles.active}`;
            }
          } else if (isDisabled && styles.disabled) {
            buttonClass += ` ${styles.disabled}`;
          } else {
            buttonClass += ` ${styles.inactive}`;
          }

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              className={buttonClass}
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

