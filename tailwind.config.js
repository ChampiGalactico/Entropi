/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        "surface-hover": "var(--bg-surface-hover)",
        elevated: "var(--bg-elevated)",
        control: "var(--bg-control)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        border: "var(--border-subtle)",
        accent: "var(--accent)",
        "accent-secondary": "var(--accent-secondary)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        modal: "var(--shadow-modal)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
