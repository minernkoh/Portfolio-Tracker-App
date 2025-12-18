// reusable form input component with label and error handling
// reduces repetitive input field code in TransactionFormModal

import React from 'react';

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  placeholder,
  error,
  disabled = false,
  step,
  min,
  max,
  autoComplete = 'off',
  className = '',
  inputClassName = '',
  rightIcon,
  style,
}) {
  const hasError = !!error;
  
  // base input styles (applied to all inputs)
  const baseInputClass = `w-full bg-[var(--bg-app)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-50`;
  // conditional border color based on error state
  const borderClass = hasError
    ? 'border-red-500 focus:border-red-500'
    : 'border-[var(--border-subtle)] focus:border-[var(--text-secondary)]';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          step={step}
          min={min}
          max={max}
          autoComplete={autoComplete}
          className={`${baseInputClass} ${borderClass} ${inputClassName}`}
          style={style}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

