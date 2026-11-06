/**
 * 首页与分页：无 livereload、主题色、skip link、SRI、字体 preload、
 * 搜索 Dialog、h1、JSON-LD；分页 canonical / og:url 必须指向自身。
 */
export const name = "home";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const { siteHost } = ctx;
  const indexHtml = await ctx.readPublic("index.html");

  ctx.assert(
    !indexHtml.includes("livereload"),
    "index.html must not contain livereload (stop `hugo server` before build; it rewrites public/)",
  );
  ctx.assert(
    indexHtml.includes('name="theme-color"') ||
      indexHtml.includes("name=theme-color"),
    "index.html missing theme-color meta",
  );
  // Hugo --minify 可能去掉属性引号：class=skip-link href=#main
  ctx.assert(
    /class="?skip-link"?/.test(indexHtml) && /href="?#main"?/.test(indexHtml),
    "index.html missing skip link to #main",
  );
  ctx.assert(
    /integrity="sha256-/.test(indexHtml),
    "index.html missing SRI integrity on assets",
  );
  ctx.assert(
    !indexHtml.includes("localhost:"),
    "index.html must not embed localhost URLs (non-production baseURL)",
  );
  ctx.assert(
    /rel="?preload"?/.test(indexHtml) &&
      /as="?font"?/.test(indexHtml) &&
      /fonts\/noto-serif-sc-latin-/.test(indexHtml),
    "index.html missing latin font preload (run sync:fonts before build)",
  );
  ctx.assert(
    /fonts\/noto-serif-sc-11[789]-/.test(indexHtml),
    "index.html missing fixed CJK font preload whitelist (117/118/119)",
  );
  ctx.assert(
    /id="?search-dialog"?/.test(indexHtml) &&
      /data-search-trigger/.test(indexHtml),
    "index.html missing search dialog or menu trigger",
  );
  ctx.assert(/<h1(?:\s|>)/i.test(indexHtml), "index.html must contain an h1");
  ctx.assert(
    indexHtml.includes('.classList.add("js")'),
    "index.html must enable JS-only navigation styles before first paint",
  );
  ctx.assertJsonLdSafe(indexHtml, "index.html");
  ctx.assert(
    !/themed-badge|shields\.io|substats/.test(indexHtml),
    "index.html must not reference removed shields/themed badges",
  );

  // 分页必须使用当前页 URL 和页码，避免 canonical / OG 折叠回首页。
  for (let pageNumber = 2; ; pageNumber += 1) {
    const rel = `page/${pageNumber}/index.html`;
    if (!(await ctx.exists(rel))) {
      break;
    }
    const html = await ctx.readPublic(rel);
    const expectedURL = `${siteHost}/page/${pageNumber}/`;
    const canonical = ctx.getTagAttribute(
      html,
      /<link\b[^>]*\brel=(?:"canonical"|'canonical'|canonical)[^>]*>/i,
      "href",
    );
    const ogURL = ctx.getTagAttribute(
      html,
      /<meta\b[^>]*\bproperty=(?:"og:url"|'og:url'|og:url)[^>]*>/i,
      "content",
    );
    ctx.assert(
      canonical === expectedURL,
      `${rel} canonical must be ${expectedURL}`,
    );
    ctx.assert(ogURL === expectedURL, `${rel} og:url must be ${expectedURL}`);
    ctx.assert(
      html.includes(`第 ${pageNumber} 页`),
      `${rel} title or description missing page number`,
    );
  }
}
