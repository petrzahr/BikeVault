import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f5f6",
          100: "#e2e4e7",
          200: "#c9ccd1",
          300: "#9aa0a8",
          400: "#6b7076",
          500: "#4a4f56",
          600: "#2c2f34",
          700: "#1c1f23",
          800: "#121417",
          900: "#0c0d0f",
          950: "#08090a",
        },
        navy: {
          50: "#eef2f7",
          100: "#dbe3ee",
          200: "#b3c2d8",
          300: "#7f96b8",
          400: "#4c6690",
          500: "#2c4a76",
          600: "#1c3a63",
          700: "#152c4c",
          800: "#0f2038",
          900: "#0a1626",
          950: "#060d16",
        },
        // Neutral grey for page backgrounds and text, cool-neutral and consistent with `ink`
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
        // Functional status colors
        success: "#1c8354",
        warning: "#a3610c",
        danger: "#b3261e",
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
