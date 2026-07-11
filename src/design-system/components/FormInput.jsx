/**
 * Design system FormInput - variant: default, error (for future extensibility).
 */

import React from "react";

const BASE_INPUT_CLASS =
  "w-full bg-background-app border rounded-ds-lg px-3 py-2 text-ds-sm text-text-primary focus:outline-none transition-colors disabled:opacity-50";

const VARIANT_BORDER = {
  default: "border-border-subtle focus:border-text-secondary",
  error: "border-accent-red focus:border-accent-red",
};

export default function FormInput({
  label,
  name,
  type = "text",
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
  autoComplete = "off",
  variant,
  className = "",
  inputClassName = "",
  rightIcon,
  leftIcon,
  style,
}) {
  const effectiveVariant = variant ?? (error ? "error" : "default");
  const borderClass = VARIANT_BORDER[effectiveVariant] ?? VARIANT_BORDER.default;

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      {label != null && label !== "" && (
        <label className="text-ds-sm font-semibold text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {leftIcon}
          </div>
        )}
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
          className={`${BASE_INPUT_CLASS} ${borderClass} ${inputClassName} ${leftIcon ? "pl-7" : ""}`.trim()}
          style={style}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-ds-sm text-accent-red mt-1">{error}</p>
      )}
    </div>
  );
}
