// 环境查询：主题与动效的系统偏好在页面生命周期内不变，全站只在这里建 matchMedia。
//
// 契约：
// - prefersReducedMotion()：matchMedia 不可用或抛错时视为 false（保留动效）
// - darkSchemeQuery / reducedMotionQuery：可能为 null，调用方须自行判空
// - 其它模块禁止再自建同类查询（`npm run lint` 断言 prefers-reduced-motion 只出现在本文件）
// - 两个查询都标了 @__PURE__：只 import 其中一个的入口（如 inline/fouc.js 只取深色偏好）
//   会被 esbuild 摇掉另一个，避免为省几十字节而在别处私建查询。

function createMediaQuery(query) {
  try {
    if (typeof window.matchMedia !== "function") {
      return null;
    }
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

export const reducedMotionQuery = /* @__PURE__ */ createMediaQuery(
  "(prefers-reduced-motion: reduce)",
);

export const darkSchemeQuery = /* @__PURE__ */ createMediaQuery(
  "(prefers-color-scheme: dark)",
);

export function prefersReducedMotion() {
  return reducedMotionQuery?.matches === true;
}
