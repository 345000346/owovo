/**
 * Pagefind 索引存在性与范围：每篇文章恰一个 data-pagefind-body，
 * 其它生成 HTML 一律以 data-pagefind-ignore 整体排除；顺带全站扫描
 * h1 缺失、修改日期回流、ZgotmplZ（链接协议被过滤）。
 */
import { readFile } from "node:fs/promises";
import { relative } from "node:path";

export const name = "pagefind";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  ctx.assert(
    await ctx.exists("pagefind/pagefind.js"),
    "pagefind/pagefind.js missing (run build:search)",
  );
  ctx.assert(
    await ctx.exists("pagefind/pagefind-entry.json"),
    "pagefind/pagefind-entry.json missing",
  );

  const htmlFiles = (await ctx.listFiles(ctx.publicDir)).filter((file) =>
    file.endsWith(".html"),
  );
  let articleHtmlCount = 0;

  for (const file of htmlFiles) {
    const rel = relative(ctx.publicDir, file).replaceAll("\\", "/");
    const html = await readFile(file, "utf8");
    const bodyMarkers = html.match(/data-pagefind-body/g) || [];
    const isRedirect = /<meta\b[^>]*http-equiv=(?:"refresh"|'refresh'|refresh)/i.test(
      html,
    );

    if (html.includes("<main") && !isRedirect) {
      ctx.assert(/<h1(?:\s|>)/i.test(html), `${rel} must contain an h1`);
    }
    ctx.assert(
      !html.includes("dateModified") && !html.includes("article:modified_time"),
      `${rel} must not expose a modification date`,
    );
    ctx.assert(
      !html.includes("ZgotmplZ"),
      `${rel} contains ZgotmplZ (a content link scheme was filtered; use http/https/mailto)`,
    );

    if (ctx.isArticleHtml(rel)) {
      articleHtmlCount += 1;
      ctx.assert(
        bodyMarkers.length === 1,
        `${rel} must contain exactly one data-pagefind-body marker`,
      );
      continue;
    }
    ctx.assert(
      bodyMarkers.length === 0,
      `${rel} must not contain data-pagefind-body (Pagefind indexes articles only)`,
    );
    if (html.includes("<body")) {
      ctx.assert(
        html.includes("data-pagefind-ignore"),
        `${rel} must contain data-pagefind-ignore`,
      );
    }
  }

  ctx.assert(articleHtmlCount > 0, "no article HTML found for Pagefind scope check");
}
