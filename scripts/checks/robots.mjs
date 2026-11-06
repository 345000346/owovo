/** robots.txt：production 构建整站 Allow，仅排除纪念页，并声明 Sitemap 主机。 */
export const name = "robots";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const robots = await ctx.readPublic("robots.txt");
  ctx.assert(
    /^\s*Allow:\s*\/\s*$/m.test(robots) &&
      !/^\s*Disallow:\s*\/\s*$/m.test(robots),
    "robots.txt must Allow: / in production builds (got whole-site Disallow or missing Allow)",
  );
  ctx.assert(
    /^\s*Disallow:\s*\/love(\.html|\/)\s*$/m.test(robots),
    "robots.txt must Disallow /love.html and /love/ (memorial page stays out of search & AI indexes)",
  );
  ctx.assert(
    robots.includes(`Sitemap: ${ctx.siteHost}/sitemap.xml`),
    `robots.txt Sitemap must be ${ctx.siteHost}/sitemap.xml`,
  );
}
