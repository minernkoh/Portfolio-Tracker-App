/**
 * Design system Card - variants: default, stat, elevated.
 */

import React from "react";

const VARIANT_STYLES = {
  default:
    "bg-background-card border border-border-subtle rounded-ds-lg p-4",
  stat: "bg-transparent sm:bg-background-card p-0 sm:p-4 rounded-none sm:rounded-ds-lg border-b sm:border border-border-subtle pb-4 mb-4 sm:mb-0 last:mb-0 last:border-b-0",
  elevated:
    "bg-background-card border border-border-subtle rounded-ds-lg p-4 shadow-xl",
};

const VALUE_SEMANTIC = {
  positive: "text-accent-green",
  negative: "text-accent-red",
  neutral: "text-text-primary",
};

export default function Card({
  variant = "default",
  label,
  subtitle,
  valueSemantic,
  className = "",
  children,
}) {
  const variantClass = VARIANT_STYLES[variant];

  if (variant === "stat") {
    const valueClass = VALUE_SEMANTIC[valueSemantic] ?? "text-text-primary";
    return (
      <div className={`${variantClass} ${className}`.trim()}>
        {label != null && (
          <div className="text-text-secondary text-ds-xs font-bold uppercase mb-1">
            {label}
          </div>
        )}
        <div
          className={`text-ds-sm sm:text-ds-lg font-bold truncate ${valueClass}`}
        >
          {children}
        </div>
        {subtitle != null && (
          <div
            className={`text-ds-xs font-bold ${
              valueSemantic === "positive"
                ? "text-accent-green"
                : valueSemantic === "negative"
                  ? "text-accent-red"
                  : ""
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    );
  }

  return <div className={`${variantClass} ${className}`.trim()}>{children}</div>;
}
