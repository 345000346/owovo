// 主题偏好：light → dark → system。
//
// 与 layouts/partials/head.html 的 FOUC 契约（须同步）：
// - localStorage key: "theme"
// - preference: "light" | "dark" | "system"（非法 → "system"）
// - 解析后: "light" | "dark"（system → prefers-color-scheme）
// - documentElement: data-theme、data-theme-preference
// - meta[name=theme-color]: content + data-theme-color-light/dark
// FOUC 只上色；本文件负责切换、存储、系统主题与 themechange。
// 图标由 [data-theme-preference] CSS 驱动。
// Concat：与 navigation.js / scroll-ui.js 同 module，顶层仅 initTheme。

function initTheme() {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const themeSwitcher = document.getElementById("theme-switcher");

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
      // 隐私模式或存储被拦截时忽略。
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

  function preferenceLabel(preference) {
    switch (preference) {
      case "light":
        return "浅色";
      case "dark":
        return "深色";
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
    let normalized = "system";
    if (
      preference === "light" ||
      preference === "dark" ||
      preference === "system"
    ) {
      normalized = preference;
    }
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
    const nextByPreference = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    const newPreference = nextByPreference[safeGetTheme()] || "light";
    safeSetTheme(newPreference);
    applyThemeFromPreference(newPreference, { force: true });
  }

  function handleSystemThemeChange() {
    if (safeGetTheme() === "system") {
      applyThemeFromPreference("system", { force: true });
    }
  }

  // FOUC 已写过匹配属性；仅在与存储/系统不一致时重写。
  applyThemeFromPreference(safeGetTheme());

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
    themeSwitcher.addEventListener("click", (event) => {
      event.preventDefault();
      cycleTheme();
    });
  }
}

initTheme();
