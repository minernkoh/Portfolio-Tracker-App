/**
 * Design system Button - single component with variants.
 * Variants: primary, secondary, ghost, icon (icon-only).
 */

import React from "react";

const VARIANT_STYLES = {
  primary: "bg-accent-blue text-white font-bold rounded-ds-lg hover:opacity-90 transition-colors disabled:opacity-50",
  secondary:
    "bg-background-card border border-border-subtle text-text-primary font-bold rounded-ds-lg hover:bg-background-card-hover transition-colors disabled:opacity-50",
  ghost:
    "text-text-secondary hover:text-text-primary hover:bg-border-subtle font-bold rounded-ds-lg transition-colors disabled:opacity-50",
  icon:
    "text-text-secondary hover:text-text-primary hover:bg-border-subtle rounded-ds-md transition-colors disabled:opacity-50 p-1.5",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-ds-xs gap-1.5",
  md: "px-4 py-2 text-ds-sm gap-2",
  lg: "px-6 py-2.5 text-ds-sm gap-2",
};

const ICON_SIZE = { sm: 14, md: 16, lg: 18 };

export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  fullWidth = false,
  title,
  className = "",
}) {
  const isIconOnly = variant === "icon" || (Icon && !children && variant !== "icon");
  const baseClass = "flex items-center justify-center inline-flex";
  const variantClass = VARIANT_STYLES[variant];
  const sizeClass = variant === "icon" ? "" : SIZE_CLASSES[size];
  const widthClass = fullWidth ? "w-full" : "";

  const buttonClass = [baseClass, variantClass, sizeClass, widthClass, className]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");

  const iconSize = typeof size === "string" ? ICON_SIZE[size] ?? 16 : size;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClass}
      title={title}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {!isIconOnly && <span className="ml-2">Saving...</span>}
        </>
      ) : (
        <>
          {Icon && <Icon size={isIconOnly && typeof iconSize === "number" ? 18 : iconSize} weight="bold" />}
          {children}
        </>
      )}
    </button>
  );
}
