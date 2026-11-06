/**
 * sitemap.xml：主机正确，且不含已关闭的 section 根 /post/ 与已移除的 /search/、/categories/。
 * 同时确认 /post/index.html 不被生成（文章实体仍走 /post/:slug/）。
 */
export const name = "sitemap";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const { siteHost } = ctx;
  const sitemap = await ctx.readPublic("sitemap.xml");
  ctx.assert(
    sitemap.includes(`${siteHost}/`),
    `sitemap.xml must use host ${siteHost}`,
  );
  ctx.assert(
    !sitemap.includes(`${siteHost}/post/</loc>`) &&
      !sitemap.includes(`${siteHost}/post<`),
    "sitemap.xml must not list section root /post/ (section output disabled; use /archives/)",
  );
  ctx.assert(
    sitemap.includes(`${siteHost}/archives/`),
    "sitemap.xml must include /archives/",
  );
  ctx.assert(
    !sitemap.includes(`${siteHost}/search`),
    "sitemap.xml must not list removed /search/ page",
  );
  ctx.assert(
    !sitemap.includes(`${siteHost}/categories`),
    "sitemap.xml must not list removed /categories/ taxonomy",
  );

  ctx.assert(!(await ctx.exists("post/index.html")), "post/index.html must not exist");
}
