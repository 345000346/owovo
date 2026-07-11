"use strict";

// Theme preference: light → dark → system.
// FOUC bootstrap in <head> sets data-theme + data-theme-preference before paint.
// Icons are driven purely by [data-theme-preference] CSS.

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function safeGetTheme() {
  try {
    return localStorage.getItem("theme") || "system";
  } catch {
    return "system";
  }
}

function safeSetTheme(value) {
  try {
    localStorage.setItem("theme", value);
  } catch {
    // Privacy mode / blocked storage.
  }
}

function getSystemPreference() {
  return mediaQuery.matches ? "dark" : "light";
}

function resolveTheme(preference) {
  if (preference === "system") {
    return getSystemPreference();
  }
  return preference === "dark" ? "dark" : "light";
}

function applyThemeFromPreference(preference, { force = false } = {}) {
  const normalized =
    preference === "light" || preference === "dark" || preference === "system"
      ? preference
      : "system";
  const theme = resolveTheme(normalized);
  const root = document.documentElement;

  if (
    !force &&
    root.getAttribute("data-theme") === theme &&
    root.getAttribute("data-theme-preference") === normalized
  ) {
    return;
  }

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-preference", normalized);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const light = meta.dataset.themeColorLight || meta.getAttribute("content");
    const dark = meta.dataset.themeColorDark || light;
    const next = theme === "dark" ? dark : light;
    if (meta.getAttribute("content") !== next) {
      meta.setAttribute("content", next);
    }
  }

  window.dispatchEvent(
    new CustomEvent("themechange", {
      detail: { preference: normalized, theme },
    }),
  );
}

function cycleTheme() {
  const currentPreference = safeGetTheme();
  let newPreference;
  switch (currentPreference) {
    case "light":
      newPreference = "dark";
      break;
    case "dark":
      newPreference = "system";
      break;
    case "system":
    default:
      newPreference = "light";
      break;
  }
  safeSetTheme(newPreference);
  applyThemeFromPreference(newPreference, { force: true });
}

// FOUC already applied matching attrs; only re-apply when storage/OS differs.
applyThemeFromPreference(safeGetTheme());

mediaQuery.addEventListener("change", () => {
  if (safeGetTheme() === "system") {
    applyThemeFromPreference("system", { force: true });
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== "theme") {
    return;
  }
  applyThemeFromPreference(event.newValue || "system", { force: true });
});

const themeSwitcher = document.getElementById("theme-switcher");
if (themeSwitcher) {
  themeSwitcher.addEventListener("click", (e) => {
    e.preventDefault();
    cycleTheme();
  });
}
