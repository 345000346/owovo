/**
 * 文章抽样：JSON-LD、data-pagefind-body、og:image 三级兜底、
 * 外链 rel、搜索 Dialog 与 ?hl= 高亮配置。
 */
export const name = "post";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const postRel = await ctx.findSamplePostHtml();
  if (!postRel) {
    ctx.assert(false, "no post/*/index.html found to spot-check");
    return;
  }

  const postHtml = await ctx.readPublic(postRel);
  ctx.assertJsonLdSafe(postHtml, postRel);
  // 文章 JSON-LD 必须是 BlogPosting 分支（同 home 的 WebSite 断言，防分支错落）。
  {
    const ldTexts = ctx.extractJsonLdTexts(postHtml);
    const postType = ldTexts.length
      ? (() => {
          try {
            return JSON.parse(ldTexts[0])?.["@type"];
          } catch {
            return null;
          }
        })()
      : null;
    ctx.assert(
      postType === "BlogPosting",
      `${postRel} JSON-LD @type must be BlogPosting (got ${JSON.stringify(postType)})`,
    );
  }
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
