// 主题偏好：light → dark → system。
//
// 与 layouts/partials/head.html 的 FOUC 契约（须同步）：
// - localStorage key: "theme"
// - preference: "light" | "dark" | "system"（非法 → "system"）
// - 解析后: "light" | "dark"（system → prefers-color-scheme）
// - documentElement: data-theme、data-theme-preference
// - meta[name=theme-color]: content + data-theme-color-light/dark
// - meta[name=color-scheme]: content = "light" | "dark"
// FOUC 只上色；本文件负责切换、存储、系统主题与 themechange。
// 图标由 [data-theme-preference] CSS 驱动。
// 切换用 View Transition 做背景扩散渐变（reduced motion / 无 API 时直接应用）。
// Concat：与 navigation.js / scroll-ui.js 同 module，顶层仅 initTheme。

function initTheme() {
  let transientPreference = null;
  let mediaQuery = null;
  let reducedMotionQuery = null;
  try {
    if (typeof window.matchMedia === "function") {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
    }
  } catch {
    // matchMedia 不可用时按浅色作为系统主题的最终回退。
  }
  const themeSwitcher = document.getElementById("theme-switcher");

  function safeGetTheme() {
    try {
      return localStorage.getItem("theme") || transientPreference || "system";
    } catch {
      return transientPreference || "system";
    }
  }

  function safeSetTheme(value) {
    try {
      localStorage.setItem("theme", value);
      transientPreference = null;
    } catch {
      transientPreference = value;
      // 隐私模式或存储被拦截时忽略。
    }
  }

  function getSystemPreference() {
    return mediaQuery?.matches ? "dark" : "light";
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
    const label = preferenceLabel(preference);
    themeSwitcher.setAttribute("aria-label", `切换主题，当前：${label}`);
    const text = themeSwitcher.querySelector(".theme-switcher-label");
    if (text && text.textContent !== label) {
      text.textContent = label;
    }
  }

  function syncColorScheme(theme) {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta && meta.getAttribute("content") !== theme) {
      meta.setAttribute("content", theme);
    }
  }

  function prefersReducedMotion() {
    return reducedMotionQuery?.matches === true;
  }

  function writeThemeState(normalized, theme) {
    const root = document.documentElement;
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
    syncColorScheme(theme);

    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { preference: normalized, theme },
      }),
    );
  }

  function applyThemeFromPreference(
    preference,
    { force = false, spreadFrom = null } = {},
  ) {
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

    // 早退：FOUC 已写过匹配的 preference，信任其解析结果（system 时不再重解析，
    // 防 matchMedia 初始值与 FOUC 翻转时把深色覆盖回浅色）。force 路径（点击/存储/系统变化）仍完整重写。
    if (!force && root.getAttribute("data-theme-preference") === normalized) {
      syncThemeSwitcherLabel(normalized);
      return;
    }

    // 切换用 View Transition 做扩散渐变；reduced motion 或 API 缺失时直接应用。
    // VT 期间临时禁用元素过渡（CSS 变量变化会触发 body/a 等的 0.5s 过渡），
    // 否则新快照拍到的是过渡中间值，扩散窗口内颜色会滞后。
    // spreadFrom：真实点击事件（detail>0）时把坐标写入 --spread-x/y，扩散从点击处开始。
    const apply = () => {
      if (
        spreadFrom &&
        spreadFrom.detail > 0 &&
        typeof spreadFrom.clientX === "number"
      ) {
        root.style.setProperty("--spread-x", `${spreadFrom.clientX}px`);
        root.style.setProperty("--spread-y", `${spreadFrom.clientY}px`);
      }
      writeThemeState(normalized, theme);
    };
    if (
      force &&
      typeof document.startViewTransition === "function" &&
      !prefersReducedMotion()
    ) {
      let transition;
      try {
        transition = document.startViewTransition(() => {
          document.documentElement.classList.add("theme-transitioning");
          apply();
        });
      } catch {
        // 过渡进行中再次切换会抛 InvalidStateError：直接应用，保证存储与 UI 一致。
        apply();
        return;
      }
      transition?.finished
        ?.then(() =>
          document.documentElement.classList.remove("theme-transitioning"),
        )
        .catch(() =>
          document.documentElement.classList.remove("theme-transitioning"),
        );
      return;
    }
    apply();
  }

  function cycleTheme(event) {
    const nextByPreference = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    const newPreference = nextByPreference[safeGetTheme()] || "light";
    safeSetTheme(newPreference);
    applyThemeFromPreference(newPreference, { force: true, spreadFrom: event });
  }

  function handleSystemThemeChange() {
    if (safeGetTheme() === "system") {
      applyThemeFromPreference("system", { force: true });
    }
  }

  // FOUC 已写过匹配属性；仅在与存储/系统不一致时重写。
  applyThemeFromPreference(safeGetTheme());

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleSystemThemeChange);
    }
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
      cycleTheme(event);
    });
  }
}

initTheme();
