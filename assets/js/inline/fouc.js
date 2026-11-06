// 首绘前上色（FOUC）：由 head.html 以 js.Build(iife) 内联进 <head>，必须同步执行。
//
// 与 assets/js/theme.js 的契约（须同步）：
// - localStorage key: "theme"
// - 取值: "light" | "dark" | "system"（非法 → "system"）
// - 解析后: "light" | "dark"（system → prefers-color-scheme）
// - documentElement: data-theme、data-theme-preference
// - meta[name=theme-color]: content ← data-theme-color-light / data-theme-color-dark
// - meta[name=color-scheme]: content = 解析后的 theme
// 只上色，不绑定事件、不做切换；切换与存储由 theme.js 负责。
// 系统偏好查询统一来自 assets/js/lib/env.js（本文件不自建 matchMedia）。

import { darkSchemeQuery } from "../lib/env.js";

document.documentElement.classList.add("js");

function syncThemeMeta(theme) {
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    const nextColor =
      theme === "dark"
        ? themeMeta.getAttribute("data-theme-color-dark")
        : themeMeta.getAttribute("data-theme-color-light");
    if (nextColor) {
      themeMeta.setAttribute("content", nextColor);
    }
  }
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute("content", theme);
  }
}

function resolveTheme(preference) {
  if (preference !== "system") {
    return preference === "dark" ? "dark" : "light";
  }
  return darkSchemeQuery?.matches === true ? "dark" : "light";
}

function applyTheme(theme, preference) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-preference", preference);
  syncThemeMeta(theme);
}

let preference = "system";
try {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    preference = stored;
  }
} catch {
  // 隐私模式或存储被拦截：按 system 继续，不阻断首绘。
}

applyTheme(resolveTheme(preference), preference);
