import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // BikeVault global neutral palette: subtly darker & cooler than CashPilot
        // CashPilot slate-50 is #f8fafc (98% L); BikeVault slate-50 is #edf2f7 (95% L)
        // Clearly a light-theme palette, but distinctly cooler/grounded with increased card separation
        slate: {
          50: "#edf2f7",
          100: "#e2e8f0",
          200: "#cbd5e1",
          300: "#b4c3d2",
          400: "#8294a8",
          500: "#56697e",
          600: "#3c4d61",
          700: "#27374a",
          800: "#162334",
          900: "#0c1726",
          950: "#060d17",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
