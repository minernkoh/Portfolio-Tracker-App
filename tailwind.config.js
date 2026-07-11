/** @type {import('tailwindcss').Config} */
import { tokens } from "./src/design-system/tokens.js";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          app: "var(--bg-app)",
          card: "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
        },
        border: {
          subtle: "var(--border-subtle)",
          highlight: "var(--border-highlight)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
        },
        accent: {
          blue: "var(--accent-blue)",
          green: "var(--accent-green)",
          red: "var(--accent-red)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "ds-sm": `${tokens.radius.sm}px`,
        "ds-md": `${tokens.radius.md}px`,
        "ds-lg": `${tokens.radius.lg}px`,
      },
      spacing: {
        "ds-xs": `${tokens.spacing.xs}px`,
        "ds-sm": `${tokens.spacing.sm}px`,
        "ds-md": `${tokens.spacing.md}px`,
        "ds-lg": `${tokens.spacing.lg}px`,
        "ds-xl": `${tokens.spacing.xl}px`,
      },
      fontSize: {
        "ds-xs": `${tokens.typography.fontSize.xs}px`,
        "ds-sm": `${tokens.typography.fontSize.sm}px`,
        "ds-md": `${tokens.typography.fontSize.md}px`,
        "ds-lg": `${tokens.typography.fontSize.lg}px`,
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
