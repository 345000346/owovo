/**
 * 构建后对 ./public（或 SMOKE_PUBLIC_DIR / argv[2]）做冒烟断言。
 * 应在 build:site 之后运行；涉及 Pagefind 的断言需先 build:search。
 *
 * 用法：node scripts/smoke-public.mjs [publicDir]
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(
  root,
  process.env.SMOKE_PUBLIC_DIR || process.argv[2] || "public",
);
const siteHost = "https://owovo.xyz";

/** @type {string[]} */
const failures = [];

/** @param {unknown} cond @param {string} message */
function assert(cond, message) {
  if (!cond) {
    failures.push(message);
  }
}

function exitIfFailed() {
  if (!failures.length) {
    return;
  }
  console.error("smoke-public: FAILED");
  for (const f of failures) {
    console.error(`  ✗ ${f}`);
  }
  process.exit(1);
}

/** @param {string} rel */
function publicPath(rel) {
  return join(publicDir, rel);
}

/** @param {string} tag @param {string} name */
function getAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match ? match[1] ?? match[2] ?? match[3] : null;
}

/** @param {string} html @param {RegExp} pattern @param {string} name */
function getTagAttribute(html, pattern, name) {
  const tag = html.match(pattern)?.[0];
  return tag ? getAttribute(tag, name) : null;
}

/** @param {string} rel */
async function readPublic(rel) {
  return readFile(publicPath(rel), "utf8");
}

/** @param {string} rel */
async function exists(rel) {
  try {
    await stat(publicPath(rel));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} dir
 * @param {(name: string) => boolean} pred
 */
async function findFirstFile(dir, pred) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (entry.isFile() && pred(entry.name)) {
      return join(dir, entry.name);
    }
  }
  return null;
}

/** @param {string} dir */
async function listFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/** @param {string} rel */
function isArticleHtml(rel) {
  return /^post\/[^/]+\/index\.html$/.test(rel);
}

/** 任选一篇 post 的 index.html 做抽样检查。 */
async function findSamplePostHtml() {
  let entries;
  try {
    entries = await readdir(publicPath("post"), { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const rel = join("post", entry.name, "index.html");
    if (await exists(rel)) {
      return rel;
    }
  }
  return null;
}

async function main() {
  console.log(`smoke-public: checking ${publicDir}`);

  try {
    await stat(publicDir);
  } catch {
    failures.push(`${publicDir} does not exist (run build first)`);
    exitIfFailed();
  }

  // 基础产物
  for (const rel of ["index.html", "robots.txt", "sitemap.xml"]) {
    assert(await exists(rel), `${rel} missing under ${publicDir}`);
  }
  exitIfFailed();

  // robots.txt（production：Allow + Sitemap 主机）
  const robots = await readPublic("robots.txt");
  assert(
    /Allow:\s*\//.test(robots) && !/Disallow:\s*\//.test(robots),
    "robots.txt must Allow: / in production builds (got Disallow or missing Allow)",
  );
  assert(
    robots.includes(`Sitemap: ${siteHost}/sitemap.xml`),
    `robots.txt Sitemap must be ${siteHost}/sitemap.xml`,
  );

  // sitemap（/archives/；不含 /post 根、/search、/categories）
  const sitemap = await readPublic("sitemap.xml");
  assert(
    sitemap.includes(`${siteHost}/`),
    `sitemap.xml must use host ${siteHost}`,
  );
  assert(
    !sitemap.includes(`${siteHost}/post/</loc>`) &&
      !sitemap.includes(`${siteHost}/post<`),
    "sitemap.xml must not list section root /post/ (section output disabled; use /archives/)",
  );
  assert(
    sitemap.includes(`${siteHost}/archives/`),
    "sitemap.xml must include /archives/",
  );
  assert(
    !sitemap.includes(`${siteHost}/search`),
    "sitemap.xml must not list removed /search/ page",
  );
  assert(
    !sitemap.includes(`${siteHost}/categories`),
    "sitemap.xml must not list removed /categories/ taxonomy",
  );

  // /post/ 根不再生成；文章实体仍使用 /post/:slug/。
  const postRootRel = "post/index.html";
  assert(!(await exists(postRootRel)), `${postRootRel} must not exist`);

  // 首页（无 livereload；主题色 / skip-link / SRI / 字体 preload / 搜索）
  const indexHtml = await readPublic("index.html");
  assert(
    !indexHtml.includes("livereload"),
    "index.html must not contain livereload (stop `hugo server` before build; it rewrites public/)",
  );
  assert(
    indexHtml.includes('name="theme-color"') ||
      indexHtml.includes("name=theme-color"),
    "index.html missing theme-color meta",
  );
  // Hugo --minify 可能去掉属性引号：class=skip-link href=#main
  assert(
    /class="?skip-link"?/.test(indexHtml) && /href="?#main"?/.test(indexHtml),
    "index.html missing skip link to #main",
  );
  assert(
    /integrity="sha256-/.test(indexHtml),
    "index.html missing SRI integrity on assets",
  );
  assert(
    !indexHtml.includes("localhost:"),
    "index.html must not embed localhost URLs (non-production baseURL)",
  );
  assert(
    /rel="?preload"?/.test(indexHtml) &&
      /as="?font"?/.test(indexHtml) &&
      /fonts\/noto-serif-sc-latin-/.test(indexHtml),
    "index.html missing latin font preload (run sync:fonts before build)",
  );
  assert(
    /fonts\/noto-serif-sc-11[789]-/.test(indexHtml),
    "index.html missing fixed CJK font preload whitelist (117/118/119)",
  );
  assert(
    /id="?search-dialog"?/.test(indexHtml) &&
      /data-search-trigger/.test(indexHtml),
    "index.html missing search dialog or menu trigger",
  );
  assert(/<h1(?:\s|>)/i.test(indexHtml), "index.html must contain an h1");
  assert(
    indexHtml.includes('.classList.add("js")'),
    "index.html must enable JS-only navigation styles before first paint",
  );

  // 首页分页必须使用当前页 URL 和页码，避免 canonical / OG 折叠回首页。
  for (let pageNumber = 2; ; pageNumber += 1) {
    const rel = `page/${pageNumber}/index.html`;
    if (!(await exists(rel))) {
      break;
    }
    const html = await readPublic(rel);
    const expectedURL = `${siteHost}/page/${pageNumber}/`;
    const canonical = getTagAttribute(
      html,
      /<link\b[^>]*\brel=(?:"canonical"|'canonical'|canonical)[^>]*>/i,
      "href",
    );
    const ogURL = getTagAttribute(
      html,
      /<meta\b[^>]*\bproperty=(?:"og:url"|'og:url'|og:url)[^>]*>/i,
      "content",
    );
    assert(canonical === expectedURL, `${rel} canonical must be ${expectedURL}`);
    assert(ogURL === expectedURL, `${rel} og:url must be ${expectedURL}`);
    assert(
      html.includes(`第 ${pageNumber} 页`),
      `${rel} title or description missing page number`,
    );
  }

  // 404（有搜索 Dialog，无 ?hl= 配置）
  if (await exists("404.html")) {
    const notFound = await readPublic("404.html");
    assert(
      /id="?search-dialog"?/.test(notFound) &&
        /data-search-trigger/.test(notFound) &&
        /search-dialog\.min\./.test(notFound),
      "404.html must include search dialog, trigger, and search-dialog script",
    );
    assert(
      !/id="?search-highlight-config"?/.test(notFound),
      "404.html should not include search-highlight-config",
    );
  }
  assert(
    !/themed-badge|shields\.io|substats/.test(indexHtml),
    "index.html must not reference removed shields/themed badges",
  );

  // 样式产物
  const cssDir = publicPath("css");
  const mainCss = await findFirstFile(cssDir, (n) => n.startsWith("main."));
  const fontsCss = await findFirstFile(
    cssDir,
    (n) => n.startsWith("fonts.") && n.endsWith(".css"),
  );
  assert(mainCss, "css/main.*.css missing");
  assert(fontsCss, "css/fonts.*.css missing");
  if (fontsCss) {
    const fonts = await readFile(fontsCss, "utf8");
    assert(
      fonts.includes("font-display"),
      "fonts CSS missing font-display (expect swap)",
    );
  }
  if (mainCss) {
    const css = await readFile(mainCss, "utf8");
    assert(
      css.includes(".js .nav{") &&
        css.includes(":root:not(.js) .header{position:static}"),
      "main CSS must keep mobile navigation visible when JavaScript is unavailable",
    );
  }

  // 标签页使用中文标题和标签专属描述。
  const tagEntries = await readdir(publicPath("tags"), { withFileTypes: true });
  const sampleTag = tagEntries.find((entry) => entry.isDirectory());
  if (sampleTag) {
    const rel = join("tags", sampleTag.name, "index.html");
    const html = await readPublic(rel);
    assert(/<title>标签：/.test(html), `${rel} title must start with 标签：`);
    assert(
      /<h1(?:\s[^>]*)?>标签：/.test(html),
      `${rel} must contain a Chinese tag h1`,
    );
    assert(
      html.includes("标签下的文章，共") && !html.includes('name=description content="分享一些日常'),
      `${rel} must use a term-specific description`,
    );
  }

  // RSS 版权必须是纯文本，不能泄露 Markdown 链接语法。
  if (await exists("rss.xml")) {
    const rss = await readPublic("rss.xml");
    assert(
      !/<copyright>\[[^\]]+\]\([^)]+\)<\/copyright>/.test(rss),
      "rss.xml copyright must not contain raw Markdown link syntax",
    );
  }

  // Pagefind
  assert(
    await exists("pagefind/pagefind.js"),
    "pagefind/pagefind.js missing (run build:search)",
  );
  assert(
    await exists("pagefind/pagefind-entry.json"),
    "pagefind/pagefind-entry.json missing",
  );

  // Pagefind 范围：每篇文章必须提供唯一正文标记，其它生成 HTML 必须整体排除。
  const htmlFiles = (await listFiles(publicDir)).filter((file) =>
    file.endsWith(".html"),
  );
  let articleHtmlCount = 0;
  for (const file of htmlFiles) {
    const rel = relative(publicDir, file).replaceAll("\\", "/");
    const html = await readFile(file, "utf8");
    const bodyMarkers = html.match(/data-pagefind-body/g) || [];
    const isRedirect = /<meta\b[^>]*http-equiv=(?:"refresh"|'refresh'|refresh)/i.test(
      html,
    );
    if (html.includes("<main") && !isRedirect) {
      assert(/<h1(?:\s|>)/i.test(html), `${rel} must contain an h1`);
    }
    assert(
      !html.includes("dateModified") &&
        !html.includes("article:modified_time"),
      `${rel} must not expose a modification date`,
    );
    if (isArticleHtml(rel)) {
      articleHtmlCount += 1;
      assert(
        bodyMarkers.length === 1,
        `${rel} must contain exactly one data-pagefind-body marker`,
      );
      continue;
    }
    assert(
      bodyMarkers.length === 0,
      `${rel} must not contain data-pagefind-body (Pagefind indexes articles only)`,
    );
    if (html.includes("<body")) {
      assert(
        html.includes("data-pagefind-ignore"),
        `${rel} must contain data-pagefind-ignore`,
      );
    }
  }
  assert(articleHtmlCount > 0, "no article HTML found for Pagefind scope check");

  // 文章抽样（JSON-LD / pagefind-body / 外链 rel / 搜索与 hl）
  const postRel = await findSamplePostHtml();
  if (!postRel) {
    failures.push("no post/*/index.html found to spot-check");
  } else {
    const postHtml = await readPublic(postRel);
    assert(
      postHtml.includes("application/ld+json"),
      `post page missing JSON-LD: ${postRel}`,
    );
    assert(
      postHtml.includes("data-pagefind-body"),
      `post page missing data-pagefind-body: ${postRel}`,
    );
    // minify 可能去掉 rel 引号
    assert(
      /rel="?external noopener noreferrer"?/.test(postHtml) ||
        !/target="?_blank"?/.test(postHtml),
      `post external links should use noopener noreferrer when target=_blank: ${postRel}`,
    );
    assert(
      /id="?search-dialog"?/.test(postHtml),
      `post page missing search dialog: ${postRel}`,
    );
    assert(
      /id="?search-highlight-config"?/.test(postHtml),
      `post page missing search-highlight-config (hl= loader): ${postRel}`,
    );
  }

  exitIfFailed();
  console.log("smoke-public: ok");
}

main().catch((err) => {
  console.error("smoke-public: error", err);
  process.exit(1);
});
