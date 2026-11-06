/**
 * 文章抽样：JSON-LD、data-pagefind-body、og:image 三级兜底、
 * 外链 rel、搜索 Dialog 与 ?hl= 高亮配置。
 */
export const name = "post";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const postRel = await ctx.findSamplePostHtml();
  if (!postRel) {
    ctx.failures.push("no post/*/index.html found to spot-check");
    return;
  }

  const postHtml = await ctx.readPublic(postRel);
  ctx.assertJsonLdSafe(postHtml, postRel);
  ctx.assert(
    postHtml.includes("data-pagefind-body"),
    `post page missing data-pagefind-body: ${postRel}`,
  );
  // og:image 三级兜底（页级 images / 文章 bundle 首图 / siteLogo）必须至少落一级。
  ctx.assert(
    /property="?og:image"?/.test(postHtml),
    `post page missing og:image: ${postRel}`,
  );
  // minify 可能去掉 rel 引号
  ctx.assert(
    /rel="?external noopener noreferrer"?/.test(postHtml) ||
      !/target="?_blank"?/.test(postHtml),
    `post external links should use noopener noreferrer when target=_blank: ${postRel}`,
  );
  ctx.assert(
    /id="?search-dialog"?/.test(postHtml),
    `post page missing search dialog: ${postRel}`,
  );
  ctx.assert(
    /id="?search-highlight-config"?/.test(postHtml),
    `post page missing search-highlight-config (hl= loader): ${postRel}`,
  );
}
