/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./content/**/*.md",
    "./themes/meme/layouts/**/*.html",
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
