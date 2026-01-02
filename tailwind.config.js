/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#1F7AE0",
        "primary-hover": "#1665BD",
        accent: "#12C29C",
        ink: "#0F172A",
        "ink-muted": "#475569",
        "bg-muted": "#F6F8FB",
        border: "#E2E8F0",
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        xl: "12px",
        pill: "999px",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #EEF4FF 0%, #F9FBFF 100%)",
      },
    },
  },
  plugins: [],
};
