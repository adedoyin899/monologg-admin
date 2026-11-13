import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        monologg: {
          red: "#CF1719",
          redBright: "#F92729",
          purple: "#7700FD",
          green: "#004F34",
          gold: "#FEBC2D",
          black: "#000000",
          white: "#FFFFFF",
          offwhite: "#F8F8F8",
          darkBg: "#0A0A0A",
          darkCard: "#141414",
          darkBorder: "#242424",
          darkHover: "#1C1C1C",
          lightBg: "#F8F8F8",
          lightCard: "#FFFFFF",
          lightBorder: "#E8E8E8",
          lightHover: "#F0F0F0",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

