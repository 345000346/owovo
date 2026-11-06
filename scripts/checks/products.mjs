/** 基础产物必须存在。critical：缺失时后续检查无从读取，直接中止。 */
export const name = "products";
export const critical = true;

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  for (const rel of ["index.html", "404.html", "robots.txt", "sitemap.xml"]) {
    ctx.assert(await ctx.exists(rel), `${rel} missing under ${ctx.publicDir}`);
  }
}
