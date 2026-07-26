"use strict";

// Theme for badges: FOUC + theme.js (in site bundle) set data-theme before this runs.
const getResolvedTheme = () => {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "dark" ? "dark" : "light";
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
};

const fallbackBadge = (img) => {
  if (!img || img.dataset.fallbackApplied) {
    return;
  }
  img.dataset.fallbackApplied = "1";
  const span = document.createElement("span");
  span.className = "about-social-badge about-social-badge-fallback";
  span.textContent = img.getAttribute("data-fallback") || "";
  if (img.parentNode) {
    img.parentNode.replaceChild(span, img);
  }
};

const initBadgeFallback = () => {
  document
    .querySelectorAll(".about-social-badge[data-fallback]")
    .forEach((img) => {
      img.addEventListener("error", () => fallbackBadge(img));
    });
};

syncThemedBadges();
initBadgeFallback();

window.addEventListener("themechange", () => {
  syncThemedBadges();
});
