/**
 * Post-build smoke checks against ./public.
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

/**
 * @param {string} cond
 * @param {string} message
 */
function assert(cond, message) {
  if (!cond) {
    failures.push(message);
  }
}

/**
 * @param {string} rel
 */
async function readPublic(rel) {
  return readFile(join(publicDir, rel), "utf8");
}

/**
 * @param {string} rel
 */
async function exists(rel) {
  try {
    await stat(join(publicDir, rel));
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

async function main() {
  console.log(`smoke-public: checking ${publicDir}`);
  try {
    await stat(publicDir);
  } catch {
    console.error("smoke-public: FAILED");
    console.error(`  ✗ ${publicDir} does not exist (run build first)`);
    process.exit(1);
  }

  const required = ["index.html", "robots.txt", "sitemap.xml"];
  for (const rel of required) {
    if (!(await exists(rel))) {
      failures.push(`${rel} missing under ${publicDir}`);
    }
  }
  if (failures.length) {
    console.error("smoke-public: FAILED");
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }

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

  const indexHtml = await readPublic("index.html");
  assert(
    !indexHtml.includes("livereload"),
    "index.html must not contain livereload (stop `hugo server` before build; it rewrites public/)",
  );
  assert(
    indexHtml.includes('name="theme-color"'),
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
      /fonts\/noto-serif-sc-/.test(indexHtml),
    "index.html missing critical font preload (run sync:fonts before build)",
  );

  const cssDir = join(publicDir, "css");
  const mainCss = await findFirstFile(cssDir, (n) => n.startsWith("main."));
  const fontsCss = await findFirstFile(
    cssDir,
    (n) => n.startsWith("fonts.") && n.endsWith(".css"),
  );
  assert(mainCss !== null, "public/css/main.*.css missing");
  assert(fontsCss !== null, "public/css/fonts.*.css missing");
  if (fontsCss) {
    const fonts = await readFile(fontsCss, "utf8");
    assert(
      fonts.includes("font-display"),
      "fonts CSS missing font-display (expect swap)",
    );
  }

  assert(
    await exists("pagefind/pagefind.js"),
    "public/pagefind/pagefind.js missing (run build:search)",
  );
  assert(
    await exists("pagefind/pagefind-entry.json"),
    "public/pagefind/pagefind-entry.json missing",
  );

  // Spot-check one post page if present.
  const postRoot = join(publicDir, "post");
  let postHtmlPath = null;
  try {
    const postEntries = await readdir(postRoot, { withFileTypes: true });
    for (const entry of postEntries) {
      if (!entry.isDirectory()) continue;
      const candidate = join(postRoot, entry.name, "index.html");
      try {
        await stat(candidate);
        postHtmlPath = candidate;
        break;
      } catch {
        // try next
      }
    }
  } catch {
    // no posts
  }

  if (postHtmlPath) {
    const postHtml = await readFile(postHtmlPath, "utf8");
    assert(
      postHtml.includes("application/ld+json"),
      `post page missing JSON-LD: ${postHtmlPath}`,
    );
    assert(
      postHtml.includes("data-pagefind-body"),
      `post page missing data-pagefind-body: ${postHtmlPath}`,
    );
    assert(
      postHtml.includes('rel="external noopener noreferrer"') ||
        !postHtml.includes('target="_blank"'),
      `post external links should use noopener noreferrer when target=_blank: ${postHtmlPath}`,
    );
  } else {
    failures.push("no public/post/*/index.html found to spot-check");
  }

  if (failures.length) {
    console.error("smoke-public: FAILED");
    for (const f of failures) {
      console.error(`  ✗ ${f}`);
    }
    process.exit(1);
  }

  console.log("smoke-public: ok");
}

main().catch((err) => {
  console.error("smoke-public: error", err);
  process.exit(1);
});
