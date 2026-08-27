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
          cyan: "#22D3EE",
          "cyan-light": "#67E8F9",
          blue: "#3B82F6",
          "blue-light": "#60A5FA",
          purple: "#8B5CF6",
          "purple-light": "#A78BFA",
          violet: "#7C3AED",
          green: "#10b981",
          emerald: "#34d399",
        },
        gradient: {
          "brand-soft": "linear-gradient(135deg, #22D3EE 0%, #3B82F6 100%)",
          "brand-aurora": "linear-gradient(135deg, #22D3EE 0%, #8B5CF6 100%)",
          brand: "linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)",
          "blue-purple": "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
          "cyan-blue": "linear-gradient(135deg, #22D3EE 0%, #3B82F6 100%)",
          green: "linear-gradient(135deg, #10b981 0%, #22d3ee 100%)",
          emerald: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
        },
      },
      boxShadow: {
        "glow-cyan": "0 0 30px rgba(34, 211, 238, 0.4)",
        "glow-blue": "0 0 30px rgba(59, 130, 246, 0.4)",
        "glow-purple": "0 0 30px rgba(139, 92, 246, 0.4)",
        "glow-brand": "0 0 30px rgba(99, 102, 241, 0.35)",
      },
      animation: {
        "gradient-mesh": "gradientMesh 18s ease-in-out infinite",
        "shimmer-text": "shimmerText 3s linear infinite",
        "float-orb": "floatOrb 8s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "gradient-x": "gradientX 6s ease infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        gradientMesh: {
          "0%, 100%": { "background-position": "0% 50%" },
          "33%": { "background-position": "100% 50%" },
          "66%": { "background-position": "50% 100%" },
        },
        shimmerText: {
          "0%": { "background-position": "0% 50%" },
          "100%": { "background-position": "200% 50%" },
        },
        floatOrb: {
          "0%, 100%": { transform: "translateY(0) translateX(0)", opacity: "0.6" },
          "50%": { transform: "translateY(-20px) translateX(6px)", opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        gradientX: {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      backgroundSize: {
        "300": "300%",
      },
    },
  },
  plugins: [],
};

export default config;
