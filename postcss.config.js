module.exports = {
  plugins: {
    autoprefixer: {},
    ...(process.env.HUGO_ENVIRONMENT === "production"
      ? { cssnano: { preset: "default" } }
      : {}),
  },
}
