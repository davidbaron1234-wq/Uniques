import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#CAE6CE",
        "primary-dark": "#9DC4A2",
        background: "#221F1F",
        "background-light": "#2C2929",
        muted: "#787569",
        surface: "#AA95C5",
        "surface-dark": "#8A74A8",
        "surface-light": "#C4B4DA",
        text: "#FCF9D5",
        "text-muted": "rgba(252, 249, 213, 0.5)",
        // Aliases for backward compat in any lingering class names
        charcoal: "#221F1F",
        "charcoal-light": "#3A3535",
        "charcoal-dark": "#181515",
        mint: "#CAE6CE",
        "mint-dark": "#9DC4A2",
        cream: "#FCF9D5",
        "cream-dark": "#E8E4B0",
        lavender: "#AA95C5",
        "lavender-dark": "#8A74A8",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.15)",
        "soft-lg": "0 8px 32px rgba(0, 0, 0, 0.2)",
        "soft-xl": "0 12px 48px rgba(0, 0, 0, 0.25)",
        glow: "0 0 20px rgba(202, 230, 206, 0.15)",
        "glow-surface": "0 0 20px rgba(170, 149, 197, 0.15)",
      },
      animation: {
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-soft": "bounceSoft 0.5s ease-out",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        bounceSoft: {
          "0%": { transform: "scale(0.95)" },
          "50%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(202, 230, 206, 0)" },
          "50%": { boxShadow: "0 0 24px 6px rgba(202, 230, 206, 0.12)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
