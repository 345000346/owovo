/** RSS：copyright 必须是纯文本，不得泄露 Markdown 链接语法。 */
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
}
