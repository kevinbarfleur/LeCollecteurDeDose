import type { Config } from "tailwindcss";
import { tailwindColors, tailwindBoxShadows } from "./constants/colors";

export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      // Colors imported from centralized constants
      colors: tailwindColors,
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Crimson Text", "serif"],
      },
      // Border radius aligned with design system
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        runic: "6px",
        card: "12px",
      },
      // Custom transition timing functions
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.03, 0.98, 0.52, 0.99)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      // Custom transition durations
      transitionDuration: {
        fast: "150ms",
        base: "300ms",
        slow: "400ms",
      },
      // Box shadows imported from centralized constants
      boxShadow: tailwindBoxShadows,
      // Z-index standardized values
      zIndex: {
        modal: "10000",
        dropdown: "1000",
        sticky: "100",
        "card-detail": "9999",
      },
      // Custom spacing for PoE design
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      animation: {
        shimmer: "shimmer 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

