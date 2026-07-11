/**
 * Theme definitions for dark and light mode.
 * Maps semantic token names to CSS variable values for runtime theme switching.
 */

/** Dark theme (default) - matte black, stockpenguins inspired */
export const darkTheme = {
  "--bg-app": "#09090b",
  "--bg-card": "#121214",
  "--bg-card-hover": "#1c1c1f",
  "--border-subtle": "rgba(39, 39, 42, 0.4)",
  "--border-highlight": "rgba(63, 63, 70, 0.4)",
  "--text-primary": "#ededed",
  "--text-secondary": "#a1a1aa",
  "--accent-blue": "#3b82f6",
  "--accent-green": "#22c55e",
  "--accent-red": "#ef4444",
  "--font-family": "'Inter', system-ui, -apple-system, sans-serif",
};

/** Light theme */
export const lightTheme = {
  "--bg-app": "#ffffff",
  "--bg-card": "#f9fafb",
  "--bg-card-hover": "#f3f4f6",
  "--border-subtle": "rgba(209, 213, 219, 0.6)",
  "--border-highlight": "rgba(209, 213, 219, 0.9)",
  "--text-primary": "#111827",
  "--text-secondary": "#4b5563",
  "--accent-blue": "#2563eb",
  "--accent-green": "#16a34a",
  "--accent-red": "#dc2626",
  "--font-family": "'Inter', system-ui, -apple-system, sans-serif",
};
