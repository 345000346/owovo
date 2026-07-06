const getResolvedTheme = () => {
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

const syncThemedBadges = () => {
  const theme = getResolvedTheme();

  document.querySelectorAll("img.themed-badge").forEach((badge) => {
    const nextSrc =
      theme === "dark" ? badge.dataset.darkSrc : badge.dataset.lightSrc;
    if (nextSrc && badge.getAttribute("src") !== nextSrc) {
      badge.setAttribute("src", nextSrc);
    }
  });

  document.documentElement.dataset.pfTheme = theme;
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    syncThemedBadges();

    new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === "data-theme")) {
        syncThemedBadges();
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  },
  { once: true },
);
