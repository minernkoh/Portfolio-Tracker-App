/**
 * Design tokens - single source of truth for the design system.
 * Used by themes.js (CSS variables) and tailwind.config.js (Tailwind theme).
 */

export const tokens = {
  color: {
    background: {
      app: "#09090b",
      card: "#121214",
      cardHover: "#1c1c1f",
    },
    border: {
      subtle: "rgba(39, 39, 42, 0.4)",
      highlight: "rgba(63, 63, 70, 0.4)",
    },
    text: {
      primary: "#ededed",
      secondary: "#a1a1aa",
    },
    accent: {
      blue: "#3b82f6",
      green: "#22c55e",
      red: "#ef4444",
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 18,
    },
  },
};
