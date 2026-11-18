import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shohoz: {
          DEFAULT: "#00581d",
          ink: "#132018",
          body: "#3f5148",
          muted: "#5c6d63",
          mist: "#f7f8f6",
          line: "#e4ebe6",
          soft: "#e7f0ea",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
