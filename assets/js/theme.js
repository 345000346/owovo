"use strict";

// Theme preference: light → dark → system.
//
// Contract with FOUC bootstrap in layouts/partials/head.html (keep in sync):
// - localStorage key: "theme"
// - preference: "light" | "dark" | "system" (invalid → "system")
// - resolved theme: "light" | "dark" (system → matchMedia prefers-color-scheme)
// - documentElement: data-theme, data-theme-preference
// - meta[name=theme-color]: content + data-theme-color-light / data-theme-color-dark
// FOUC only paints; this file owns cycle, storage sync, OS changes, themechange.
// Icons are driven by [data-theme-preference] CSS.

{
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

  const themeSwitcher = document.getElementById("theme-switcher");

  function preferenceLabel(preference) {
    switch (preference) {
      case "light":
        return "浅色";
      case "dark":
        return "深色";
      case "system":
      default:
        return "跟随系统";
    }
  }

  function syncThemeSwitcherLabel(preference) {
    if (!themeSwitcher) {
      return;
    }
    themeSwitcher.setAttribute(
      "aria-label",
      `切换主题，当前：${preferenceLabel(preference)}`,
    );
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
      syncThemeSwitcherLabel(normalized);
      return;
    }

    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-preference", normalized);
    syncThemeSwitcherLabel(normalized);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const light =
        meta.dataset.themeColorLight || meta.getAttribute("content");
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

  const handleSystemThemeChange = () => {
    if (safeGetTheme() === "system") {
      applyThemeFromPreference("system", { force: true });
    }
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleSystemThemeChange);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== "theme") {
      return;
    }
    applyThemeFromPreference(event.newValue || "system", { force: true });
  });

  if (themeSwitcher) {
    themeSwitcher.addEventListener("click", (e) => {
      e.preventDefault();
      cycleTheme();
    });
  }
}
