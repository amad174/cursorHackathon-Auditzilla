/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          green: "#00ff88",
          amber: "#ffb300",
          red: "#ff3d57",
          blue: "#00b4ff",
        },
        dark: {
          900: "#050508",
          800: "#0a0a0f",
          700: "#0d0d14",
          600: "#12121c",
          500: "#1a1a2e",
          400: "#252540",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
}

