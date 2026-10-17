import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Closed palette (see DESIGN.md): slate = neutral, signal = action, rose / emerald / steel = meaning
      colors: {
        // Burnt amber action colour. 500 is the fill (graphite text on it), 600+ is text and icons on white.
        signal: {
          50: "#fdf4e3",
          100: "#fae5bd",
          200: "#f3cb85",
          300: "#e8ac48",
          400: "#db921c",
          500: "#cc7a00",
          600: "#a65f00",
          700: "#8a4b00",
          800: "#6b3a00",
          900: "#4a2800",
          950: "#2e1900",
        },
        // Steel blue: service due soon, warnings. Distinct from the amber action colour on purpose.
        steel: {
          50: "#eef3fa",
          100: "#dce7f5",
          200: "#b9cdea",
          300: "#8aabd8",
          400: "#5a86c2",
          500: "#3a6aad",
          600: "#2b5ea7",
          700: "#1f4a86",
          800: "#183a6b",
          900: "#112b50",
          950: "#0a1a31",
        },
        // Single neutral scale (cool-neutral): canvas, surfaces, lines, text and the dark app shell
        slate: {
          50: "#f4f5f6",
          100: "#e8e9eb",
          200: "#d3d6da",
          300: "#b3b8be",
          400: "#83888f",
          500: "#5c6168",
          600: "#3d4147",
          700: "#2a2d32",
          800: "#1a1c20",
          900: "#0f1113",
          950: "#08090a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        // Measurements only (km, h, psi, bar, clicks, prices): never as a "technical" costume for prose
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Technical-drawing corners: the whole radius scale is sharpened here, so existing rounded-* utilities follow
      borderRadius: {
        sm: "2px",
        md: "2px",
        lg: "3px",
        xl: "3px",
        "2xl": "4px",
        "3xl": "4px",
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
        "sheet-in": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "sheet-in": "sheet-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
