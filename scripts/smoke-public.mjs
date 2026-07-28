/**
 * Post-build smoke checks against ./public (or SMOKE_PUBLIC_DIR / argv[2]).
 * Run after `build:site` (+ `build:search` when asserting Pagefind).
 *
 * Usage: node scripts/smoke-public.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

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

/** First post section page with an index.html, if any. */
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

  for (const rel of ["index.html", "robots.txt", "sitemap.xml"]) {
    assert(await exists(rel), `${rel} missing under ${publicDir}`);
  }
  exitIfFailed();

  const robots = await readPublic("robots.txt");
  assert(
    /Allow:\s*\//.test(robots) && !/Disallow:\s*\//.test(robots),
    "robots.txt must Allow: / in production builds (got Disallow or missing Allow)",
  );
  assert(
    robots.includes(`Sitemap: ${siteHost}/sitemap.xml`),
    `robots.txt Sitemap must be ${siteHost}/sitemap.xml`,
  );

  const sitemap = await readPublic("sitemap.xml");
  assert(
    sitemap.includes(`${siteHost}/`),
    `sitemap.xml must use host ${siteHost}`,
  );
  assert(
    !sitemap.includes(`${siteHost}/post/</loc>`) &&
      !sitemap.includes(`${siteHost}/post<`),
    "sitemap.xml must not list section root /post/ (redirect-only; use /archives/)",
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
  // Hugo --minify may drop attribute quotes: class=skip-link href=#main
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

  assert(
    await exists("pagefind/pagefind.js"),
    "pagefind/pagefind.js missing (run build:search)",
  );
  assert(
    await exists("pagefind/pagefind-entry.json"),
    "pagefind/pagefind-entry.json missing",
  );

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
    // Minify may drop quotes on rel=...
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
