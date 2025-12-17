// reusable button component with variants
// consolidates primary action buttons (add transaction, submit, etc.)

import React from 'react';
import { PlusIcon } from '@phosphor-icons/react';

const VARIANTS = {
  primary: {
    base: 'bg-[var(--accent-blue)] text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50',
  },
  secondary: {
    base: 'bg-[var(--bg-card)] text-white font-bold rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50',
  },
};

const ICONS = {
  plus: PlusIcon,
};

export default function Button({
  variant = 'primary',
  icon,
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = false,
  size = 'md',
  className = '',
}) {
  const styles = VARIANTS[variant];
  
  if (!styles) {
    console.warn(`Button: unknown variant "${variant}"`);
    return null;
  }

  const Icon = typeof icon === 'string' ? ICONS[icon] : icon;
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-sm gap-2',
  };

  const buttonClass = `
    flex items-center justify-center
    ${sizeClasses[size]}
    ${styles.base}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClass}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Saving...
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : 16} weight="bold" />}
          {children}
        </>
      )}
    </button>
  );
}

