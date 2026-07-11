/**
 * Design system Badge - variants: default, compact; semantics: buy, sell, neutral.
 */

import React from "react";

const VARIANT_STYLES = {
  default: "inline-block px-2 py-0.5 rounded-ds-sm text-ds-sm font-medium border",
  compact: "text-ds-sm font-bold px-2 py-1 rounded-ds-sm",
};

const SEMANTIC_STYLES = {
  buy: {
    default: "bg-accent-green/10 text-accent-green border-accent-green/20",
    compact: "text-accent-green bg-accent-green/20",
  },
  sell: {
    default: "bg-accent-red/10 text-accent-red border-accent-red/20",
    compact: "text-accent-red bg-accent-red/20",
  },
  neutral: {
    default: "bg-background-card-hover text-text-secondary border-border-subtle",
    compact: "text-text-secondary bg-border-subtle",
  },
};

function getSemantic(value) {
  if (value === "buy" || value === "sell" || value === "neutral") return value;
  const str = String(value || "").toLowerCase();
  if (str === "buy") return "buy";
  if (str === "sell") return "sell";
  return "neutral";
}

export default function Badge({
  variant = "default",
  semantic,
  children,
  className = "",
}) {
  const resolvedSemantic = semantic !== undefined ? getSemantic(semantic) : getSemantic(children);
  const variantClass = VARIANT_STYLES[variant];
  const semanticStyles = SEMANTIC_STYLES[resolvedSemantic][variant];

  return (
    <span className={`${variantClass} ${semanticStyles} ${className}`.trim()}>
      {children}
    </span>
  );
}
