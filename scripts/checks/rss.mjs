/** RSS：最近 20 篇摘要、copyright 纯文本、pubDate 取自文章 date。 */
export const name = "rss";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  if (!(await ctx.exists("rss.xml"))) {
    return;
  }
  const rss = await ctx.readPublic("rss.xml");
  ctx.assert(
    !/<copyright>\[[^\]]+\]\([^)]+\)<\/copyright>/.test(rss),
    "rss.xml copyright must not contain raw Markdown link syntax",
  );
  // 只收录最近 20 篇；写成区间下限断言而不是精确计数，收录不足 20 篇时照样绿。
  const itemCount = (rss.match(/<item>/g) ?? []).length;
  ctx.assert(
    itemCount > 0 && itemCount <= 20,
    `rss.xml must contain 1..20 items (got ${itemCount})`,
  );
  // 修改日期不回流：RSS 里不允许出现 lastmod 语义（pubDate 必须来自文章 date）。
  ctx.assert(!rss.includes("lastmod"), "rss.xml must not contain lastmod");
}
