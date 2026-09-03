import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F7F2E8",
          light: "#FDFBF7",
          dark: "#E7DCC8",
          darker: "#D8CBB3",
        },
        teal: {
          DEFAULT: "#1E6F6C",
          light: "#2E8A86",
          dark: "#144C4A",
          subtle: "#E6F3F2",
        },
        brass: {
          DEFAULT: "#B8872B",
          light: "#D6A343",
          dark: "#8F671E",
          subtle: "#F9F3E5",
        },
        ink: {
          DEFAULT: "#2D2D2D",
          light: "#4A4A4A",
          muted: "#756F66",
        },
        warm: {
          border: "#DDD4C5",
          borderLight: "#EDE6DA",
        },
        status: {
          danger: "#C0392B",
          dangerLight: "#FCEBE9",
          success: "#2E7D32",
          successLight: "#EAF5EA",
          warning: "#D35400",
          warningLight: "#FDF0E9",
          info: "#2980B9",
          infoLight: "#EBF5FB",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      boxShadow: {
        warm: "0 1px 3px rgba(45, 45, 45, 0.05), 0 1px 2px rgba(45, 45, 45, 0.08)",
        "warm-md": "0 4px 6px -1px rgba(45, 45, 45, 0.07), 0 2px 4px -1px rgba(45, 45, 45, 0.04)",
        "warm-lg": "0 10px 15px -3px rgba(45, 45, 45, 0.08), 0 4px 6px -2px rgba(45, 45, 45, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
