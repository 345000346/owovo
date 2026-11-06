// 首绘前折叠目录：由 layouts/_partials/utils/toc.html 以 js.Build(iife) 内联在 <details> 之后。
//
// 契约：
// - 断点读 :root --toc-side-breakpoint（真源 assets/scss/layout/_single.scss $tocSideBreakpoint）
// - 变量缺失就不动 DOM，维持模板默认（展开）
// - 只做「窄屏移除 open」，避免移动端冷加载「展开→收起」闪烁；
//   之后的开合由 assets/js/article.js 接管

const details = document.currentScript?.previousElementSibling;
if (details && details.tagName === "DETAILS") {
  const breakpoint = getComputedStyle(document.documentElement)
    .getPropertyValue("--toc-side-breakpoint")
    .trim();
  if (breakpoint && !matchMedia(`(min-width: ${breakpoint})`).matches) {
    details.removeAttribute("open");
  }
}
