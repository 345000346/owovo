/**
 * 静态资源产物：字体 CSS 的 font-display、主 CSS 的导航无 JS 兜底、
 * 以及跨文件契约数字（改动须 SCSS token ↔ JS 回退 ↔ 本文件的断言三处同步）。
 */
import { readFile } from "node:fs/promises";

export const name = "assets";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const cssDir = ctx.publicPath("css");
  const mainCss = await ctx.findFirstFile(cssDir, (n) => n.startsWith("main."));
  const fontsCss = await ctx.findFirstFile(
    cssDir,
    (n) => n.startsWith("fonts.") && n.endsWith(".css"),
  );
  ctx.assert(mainCss, "css/main.*.css missing");
  ctx.assert(fontsCss, "css/fonts.*.css missing");

  if (fontsCss) {
    const fonts = await readFile(fontsCss, "utf8");
    ctx.assert(
      fonts.includes("font-display"),
      "fonts CSS missing font-display (expect swap)",
    );
  }
  if (!mainCss) {
    return;
  }

  const css = await readFile(mainCss, "utf8");
  ctx.assert(
    css.includes(".js .nav{") &&
      css.includes(":root:not(.js) .header{position:static}"),
    "main CSS must keep mobile navigation visible when JavaScript is unavailable",
  );
  // 跨文件契约数字：导航断点 --max-width(846px)、TOC 悬浮/折叠断点 68em、导航过渡 $duration 0.5s。
  ctx.assert(
    /--max-width:\s*846px/.test(css) &&
      /--toc-side-breakpoint:\s*68em/.test(css) &&
      /\(min-width:\s*68em\)/.test(css),
    "main CSS contract literals drifted (--max-width: 846px / --toc-side-breakpoint: 68em / min-width: 68em)",
  );

  // JS 侧：site.js（concat）持导航关闭兜底；article.js（独立模块）持 TOC 断点回退。
  const siteJs = await ctx.findFirstFile(ctx.publicPath("js"), (n) =>
    n.startsWith("site."),
  );
  const articleJs = await ctx.findFirstFile(ctx.publicPath("js"), (n) =>
    n.startsWith("article."),
  );
  ctx.assert(siteJs, "js/site.*.js missing");
  ctx.assert(articleJs, "js/article.*.js missing");

  if (siteJs) {
    const js = await readFile(siteJs, "utf8");
    ctx.assert(
      /\b600\b/.test(js),
      "site JS contract literal drifted (nav close fallback 600ms >= SCSS $duration 0.5s)",
    );
  }
  if (articleJs) {
    const js = await readFile(articleJs, "utf8");
    ctx.assert(
      js.includes("68em") && js.includes("--toc-side-breakpoint"),
      "article JS contract literals drifted (TOC breakpoint fallback 68em read from --toc-side-breakpoint)",
    );
  }
}
