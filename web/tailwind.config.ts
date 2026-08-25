import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        bento: {
          surface: "var(--bento-surface)",
          "surface-light": "var(--bento-surface-light)",
          "surface-dark": "var(--bento-surface-dark)",
          "surface-darkest": "var(--bento-surface-darkest)",
        },
        glass: {
          border: "var(--glass-border)",
          highlight: "var(--glass-highlight)",
        },
        accent: {
          blue: "#3b82f6",
          cyan: "#22d3ee",
          green: "#10b981",
          emerald: "#34d399",
        },
        gradient: {
          blue: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
          cyan: "linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)",
          green: "linear-gradient(135deg, #10b981 0%, #22d3ee 100%)",
          emerald: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
