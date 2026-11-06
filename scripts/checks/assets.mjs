/**
 * 静态资源产物：字体 CSS 的 font-display、主 CSS 的导航无 JS 兜底，
 * 以及跨文件契约数字的**关系**校验。
 *
 * 契约模型（见 assets/scss/base/_responsive.scss 头部）：
 *   唯一真源 = SCSS token（$fontSize / $contentWidth / $duration / $tocSideBreakpoint）
 *   导出通道 = :root CSS 变量（--max-width / --content-width-px / --nav-close-timeout / --toc-side-breakpoint）
 *   下游 = JS 与模板只读变量，不写回退字面量
 * 因此这里断言的是「关系成立」，而不是「数字等于某个常量」：
 * 改 token 时本文件无需跟着改；只有字面量被塞回 JS / 模板时才失败。
 */
import { readFile } from "node:fs/promises";
import { relative, sep } from "node:path";

export const name = "assets";

/**
 * 从 CSS 里读某个自定义属性的值。
 * @param {string} css
 * @param {string} property 形如 "--max-width"
 * @returns {string} 去空白的值，缺失时为空串
 */
function readCustomProperty(css, property) {
  const match = css.match(new RegExp(`${property}:\\s*([^;}]+)`));
  return match ? match[1].trim() : "";
}

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

  // 1. :root 必须导出全部契约变量（JS / 模板都从这里取值）。
  const maxWidth = readCustomProperty(css, "--max-width");
  const contentWidthPx = readCustomProperty(css, "--content-width-px");
  const navCloseTimeout = readCustomProperty(css, "--nav-close-timeout");
  const tocBreakpoint = readCustomProperty(css, "--toc-side-breakpoint");
  ctx.assert(
    maxWidth && contentWidthPx && navCloseTimeout && tocBreakpoint,
    "main CSS must export contract vars --max-width / --content-width-px / --nav-close-timeout / --toc-side-breakpoint",
  );

  // 2. 媒体查询必须与导出变量一致（同一 token 的两处消费，漂移即失败）。
  if (maxWidth) {
    ctx.assert(
      css.includes(`(max-width:${maxWidth})`) ||
        css.includes(`(max-width: ${maxWidth})`),
      `main CSS media query must use --max-width (${maxWidth}) derived from the same token`,
    );
  }
  if (tocBreakpoint) {
    ctx.assert(
      css.includes(`(min-width:${tocBreakpoint})`) ||
        css.includes(`(min-width: ${tocBreakpoint})`),
      `main CSS media query must use --toc-side-breakpoint (${tocBreakpoint}) derived from the same token`,
    );
  }

  // 3. 关闭兜底必须是「时长的倍数关系」：$duration 0.5s → 600ms，比值落在 (1, 2] 的合理区间。
  const closeMs = Number.parseInt(navCloseTimeout, 10);
  ctx.assert(
    Number.isFinite(closeMs) && closeMs > 0 && closeMs <= 2000,
    `--nav-close-timeout must be a sane millisecond number (got "${navCloseTimeout}")`,
  );

  // 4. JS 不得再写回退字面量，且必须读同一批变量。
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
      js.includes("--max-width") && js.includes("--nav-close-timeout"),
      "site JS must read --max-width / --nav-close-timeout instead of hard-coded fallbacks",
    );
    ctx.assert(
      !/\b846px\b/.test(js) && !/\b600\b/.test(js),
      "site JS must not hard-code contract literals (846px / 600); read the CSS variable instead",
    );
  }
  if (articleJs) {
    const js = await readFile(articleJs, "utf8");
    ctx.assert(
      js.includes("--toc-side-breakpoint"),
      "article JS must read --toc-side-breakpoint instead of a hard-coded fallback",
    );
    ctx.assert(
      !/\b68em\b/.test(js),
      "article JS must not hard-code the TOC breakpoint (68em); read the CSS variable instead",
    );
  }

  // 5. 模板侧的构建期常量（render-image.html 的 sizes）只能与导出变量对账：
  //    出现即必须等于 --content-width-px；无多候选图时不出现，故允许 0 次。
  if (contentWidthPx) {
    const postHtmlFiles = (await ctx.listFiles(ctx.publicPath("post"))).filter(
      (file) => file.endsWith(`${sep}index.html`),
    );
    for (const file of postHtmlFiles) {
      const rel = relative(ctx.publicDir, file).split(sep).join("/");
      const html = await readFile(file, "utf8");
      const sizes = [
        ...html.matchAll(/sizes="\(max-width:\s*([^)]+)\)[^"]*"/g),
      ].map((match) => match[1].trim());
      for (const width of sizes) {
        ctx.assert(
          width === contentWidthPx,
          `${rel}: render-image sizes breakpoint ${width} must equal --content-width-px (${contentWidthPx}); update the template when changing $contentWidth/$fontSize`,
        );
      }
    }
  }
}
