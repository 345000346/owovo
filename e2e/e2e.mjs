/**
 * 浏览器端到端测试：对 ./public（或 E2E_PUBLIC_DIR）跑真实交互断言。
 * 前置：先 `npm run build`（site + search + smoke）。
 *
 * 用法：node e2e/e2e.mjs
 *   E2E_PUBLIC_DIR=dist 可指定其它构建目录；E2E_BASE_URL 可复用已运行的站点。
 *   E2E_BROWSER=msedge|chromium|firefox|webkit 可切换浏览器（默认 msedge）。
 *   HEADED=1 可显示浏览器窗口。
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicDir = resolve(root, process.env.E2E_PUBLIC_DIR || "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/** 把 URL 路径解析为 public 下的安全文件路径（目录回退 index.html）。 */
async function resolveStatic(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const candidate = resolve(publicDir, `.${decoded}`);
  if (candidate !== publicDir && !candidate.startsWith(publicDir + sep)) {
    return null;
  }
  try {
    const info = await stat(candidate);
    if (info.isDirectory()) {
      const index = join(candidate, "index.html");
      return (await stat(index)).isFile() ? index : null;
    }
    return info.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

function startServer() {
  const server = createServer(async (req, res) => {
    const file = await resolveStatic(req.url || "/");
    if (!file) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end("<!doctype html><title>Not Found</title><h1>Not Found</h1>");
      return;
    }
    const contentType = MIME[extname(file)] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(await readFile(file));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/** 找一篇带 TOC 的文章，并取一个用于搜索的标题片段。 */
async function findSamplePost() {
  const dir = join(publicDir, "post");
  const slugs = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const slug of slugs) {
    const html = await readFile(join(dir, slug, "index.html"), "utf8");
    // TOC 用例只对带目录的文章有意义；样本必须真实含目录，否则该回归被静默跳过。
    if (!/class="?toc"?/.test(html)) {
      continue;
    }
    const title = html.match(/<title>([^<|]+)\s*\|/)?.[1]?.trim();
    if (title && title.length >= 2) {
      return { slug, title, url: `/post/${slug}/` };
    }
  }
  throw new Error("public/post 下没有带 TOC 且可用于搜索测试的文章");
}

async function launchBrowser() {
  const name = (process.env.E2E_BROWSER || "msedge").toLowerCase();
  const options = { headless: !process.env.HEADED };
  // 浏览器二进制只由 Playwright 的标准供给机制解析：channel 走系统安装，
  // engine 走 npx playwright install 缓存。不硬编码任何本机文件系统路径。
  if (name === "msedge") {
    options.channel = "msedge";
    return chromium.launch(options);
  }
  const type =
    name === "firefox" ? firefox : name === "webkit" ? webkit : chromium;
  return type.launch(options);
}

const results = [];
async function test(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error });
    console.error(`  ✗ ${name}\n    ${error.message.split("\n")[0]}`);
  }
}

async function main() {
  try {
    await stat(join(publicDir, "index.html"));
    await stat(join(publicDir, "pagefind", "pagefind.js"));
  } catch {
    console.error(`E2E: ${publicDir} 未就绪，请先运行 npm run build`);
    process.exit(1);
  }
  const sample = await findSamplePost();

  const server = process.env.E2E_BASE_URL ? null : await startServer();
  const baseInput = process.env.E2E_BASE_URL || `http://127.0.0.1:${server.address().port}`;
  // URL 是层级结构，不是字符串：以带尾斜杠的 base 解析相对路径，
  // 保证 E2E_BASE_URL 有无尾斜杠、path 有无前导斜杠都得到唯一正确结果。
  const baseURL = new URL(`${baseInput.replace(/\/+$/, "")}/`);
  const url = (path) => new URL(path.replace(/^\/+/, ""), baseURL).href;
  let browser;
  try {
    browser = await launchBrowser();
    console.log(`E2E: ${baseURL.href} (${sample.url})`);

    await test("首页加载与基础结构", async () => {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(url("/"), { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator("h1").count() > 0, true);
      assert.equal(await page.locator("html.js").count(), 1);
      assert.equal(await page.locator("#search-dialog").count(), 1);
      assert.equal(await page.locator("[data-search-trigger]").count() > 0, true);
      assert.equal(await page.locator("#theme-switcher").count(), 1);
      assert.deepEqual(errors, []);
      await page.close();
    });

    await test("主题切换与 localStorage 持久化", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url("/"), { waitUntil: "networkidle" });
      const initial = await page.locator("html").getAttribute("data-theme-preference");
      const next = {
        light: "dark",
        dark: "system",
        system: "light",
      }[initial] || "light";
      await page.locator("#theme-switcher").click();
      await page.waitForFunction(
        (expected) => document.documentElement.dataset.themePreference === expected &&
          localStorage.getItem("theme") === expected,
        next,
        { timeout: 10000 },
      );
      assert.notEqual(next, initial);
      const themeColor = await page.locator('meta[name="theme-color"]').getAttribute("content");
      assert.match(themeColor || "", /^#[0-9a-f]{6}$/i);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator("html").getAttribute("data-theme-preference"), next);
      await context.close();
    });

    await test("搜索 Dialog 打开、输入并返回带 hl 的结果", async () => {
      const page = await browser.newPage();
      await page.goto(url("/"), { waitUntil: "networkidle" });
      await page.locator("[data-search-trigger]").first().click();
      await page.locator(".pagefind-ui__search-input").waitFor({ state: "visible" });
      assert.equal(new URL(page.url()).hash, "#search");
      await page.locator(".pagefind-ui__search-input").fill(sample.title.slice(0, 4));
      const result = page.locator(".pagefind-ui__result-link").first();
      await result.waitFor({ state: "visible", timeout: 10000 });
      const href = await result.getAttribute("href");
      assert.match(href || "", /[?&]hl=/);
      assert.match(href || "", /\/post\//);
      await page.locator(".search-dialog-close").click();
      await page.waitForFunction(() => !document.getElementById("search-dialog").open);
      assert.notEqual(new URL(page.url()).hash, "#search");
      await page.close();
    });

    await test("Ctrl+K 快捷打开与 Escape 关闭", async () => {
      const page = await browser.newPage();
      await page.goto(url("/"), { waitUntil: "networkidle" });
      await page.keyboard.press("Control+k");
      await page.waitForFunction(() => document.getElementById("search-dialog").open);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.getElementById("search-dialog").open);
      await page.close();
    });

    await test("文章页 ?hl= 高亮命中", async () => {
      const page = await browser.newPage();
      const term = encodeURIComponent(sample.title.slice(0, 2));
      await page.goto(url(`${sample.url}?hl=${term}`), { waitUntil: "networkidle" });
      await page.locator("mark.search-highlight").first().waitFor({ state: "attached", timeout: 10000 });
      const count = await page.locator("mark.search-highlight").count();
      assert.equal(count > 0, true);
      await page.close();
    });

    await test("文章页 TOC 与页面导航", async () => {
      const page = await browser.newPage();
      await page.goto(url(sample.url), { waitUntil: "networkidle" });
      assert.equal(await page.locator("main h1").count() > 0, true);
      const toc = page.locator(".contents .toc a[href^='#']").first();
      await toc.waitFor({ state: "attached" });
      const anchor = await toc.getAttribute("href");
      assert.match(anchor || "", /^#/);
      await page.goto(url("/archives/"), { waitUntil: "networkidle" });
      assert.match(await page.locator("h1").first().innerText(), /.+/);
      await page.goto(url("/about/"), { waitUntil: "networkidle" });
      assert.match(await page.locator("h1").first().innerText(), /.+/);
      await page.close();
    });

    await test("阅读进度与回到顶部", async () => {
      const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
      await page.goto(url(sample.url), { waitUntil: "networkidle" });
      const progress = page.locator("#reading-progress");
      if (!(await progress.count())) {
        await page.close();
        return;
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(() => {
        const el = document.getElementById("reading-progress");
        return el && Number(el.getAttribute("aria-valuenow")) > 0;
      });
      const backToTop = page.locator("#back-to-top");
      if (await backToTop.count()) {
        await page.waitForFunction(() => document.getElementById("back-to-top").classList.contains("show"));
      }
      await page.close();
    });

    await test("移动端导航开合", async () => {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
      await page.goto(url("/"), { waitUntil: "networkidle" });
      const toggle = page.locator(".nav-toggle");
      await toggle.click();
      await page.waitForFunction(() =>
        document.querySelector(".nav-toggle").getAttribute("aria-expanded") === "true");
      assert.equal(await page.locator("body.nav-open").count(), 1);
      await toggle.click();
      await page.waitForFunction(() =>
        document.querySelector(".nav-toggle").getAttribute("aria-expanded") === "false");
      await page.close();
    });
  } finally {
    await browser?.close();
    server?.close();
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\nE2E: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("E2E: FAILED");
    for (const result of failed) {
      console.error(`  ✗ ${result.name}: ${result.error.message}`);
    }
    process.exit(1);
  }
  console.log("E2E: ok");
}

main().catch((error) => {
  console.error("E2E: error", error);
  process.exit(1);
});
