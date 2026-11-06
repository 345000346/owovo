// ?hl= 高亮 loader：由 layouts/_partials/components/search-highlight-loader.html
// 以 js.Build(iife) 内联，紧跟 #search-highlight-config 模板之后。
//
// 契约：
// - 路径全部来自 #search-highlight-config 的 data-*（URL 不进 JS 字面量，防 --minify 破坏）
// - data-module / data-integrity → 动态插入的 <script type="module">
// - data-pagefind-highlight → 同时写 <html data-pagefind-highlight>，供 search-highlight.js 读取
// - 只在 URL 带非空 ?hl= 时注入，其余情况直接返回

const hasHighlight = new URLSearchParams(window.location.search)
  .getAll("hl")
  .some(Boolean);
const config = hasHighlight
  ? document.getElementById("search-highlight-config")
  : null;

if (config) {
  const pagefindPath = config.getAttribute("data-pagefind-highlight") ?? "";
  const moduleSrc = config.getAttribute("data-module") ?? "";
  const integrity = config.getAttribute("data-integrity") ?? "";

  if (pagefindPath) {
    document.documentElement.setAttribute("data-pagefind-highlight", pagefindPath);
  }

  if (moduleSrc) {
    const script = document.createElement("script");
    script.type = "module";
    script.src = moduleSrc;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = "anonymous";
    }
    if (pagefindPath) {
      script.setAttribute("data-pagefind-highlight", pagefindPath);
    }
    document.head.appendChild(script);
  }
}
