/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.md",
    "./themes/echo/layouts/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        main: "var(--text-color)",
        card: "var(--card-bg-color)",
        accent: "var(--accent-color)",
      },
    },
  },
  plugins: [],
};
