/** 404：共用 baseof，有搜索 Dialog 的入口与脚本，但不该注入 ?hl= 高亮 loader。 */
export const name = "not-found";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const notFound = await ctx.readPublic("404.html");
  ctx.assert(
    /id="?search-dialog"?/.test(notFound) &&
      /data-search-trigger/.test(notFound) &&
      /js\/search-dialog\.[^"']*\.js/.test(notFound),
    "404.html must include search dialog, trigger, and search-dialog script",
  );
  ctx.assert(
    !/id="?search-highlight-config"?/.test(notFound),
    "404.html should not include search-highlight-config",
  );
}
