import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F1EA",
        ink: "#121212",
        bauhaus: {
          red: "#E63926",
          blue: "#1D4ED8",
          yellow: "#F5C400"
        }
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      boxShadow: {
        hard: "4px 4px 0 #121212"
      }
    }
  },
  plugins: []
};

export default config;
