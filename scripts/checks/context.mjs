/**
 * smoke 检查的共享上下文：路径解析、产物读取、断言收集。
 * 各 scripts/checks/*.mjs 只通过 ctx 读写，失败累积到 ctx.failures，
 * 由 scripts/smoke-public.mjs 统一输出并以非零码退出。
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * @typedef {object} SmokeContext
 * @property {string} publicDir 产物根目录（绝对路径）
 * @property {string} siteHost 生产站点主机，用于校验 robots / sitemap
 * @property {string[]} failures 累积的失败信息
 * @property {(cond: unknown, message: string) => void} assert
 * @property {(rel: string) => string} publicPath
 * @property {(tag: string, name: string) => string | null} getAttribute
 * @property {(html: string, pattern: RegExp, name: string) => string | null} getTagAttribute
 * @property {(rel: string) => Promise<string>} readPublic
 * @property {(rel: string) => Promise<boolean>} exists
 * @property {(dir: string, pred: (name: string) => boolean) => Promise<string | null>} findFirstFile
 * @property {(dir: string) => Promise<string[]>} listFiles
 * @property {(html: string) => string[]} extractJsonLdTexts
 * @property {(html: string, rel: string) => void} assertJsonLdSafe
 * @property {(rel: string) => boolean} isArticleHtml
 * @property {() => Promise<string | null>} findSamplePostHtml
 */

/**
 * @param {{ publicDir: string, siteHost: string }} options
 * @returns {SmokeContext}
 */
export function createContext({ publicDir, siteHost }) {
  /** @type {string[]} */
  const failures = [];

  /** @param {unknown} cond @param {string} message */
  function assert(cond, message) {
    if (!cond) {
      failures.push(message);
    }
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

  /** @param {string} html */
  function extractJsonLdTexts(html) {
    const texts = [];
    const pattern =
      /<script\b[^>]*\btype=(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(pattern)) {
      texts.push(match[1].trim());
    }
    return texts;
  }

  /** @param {string} html @param {string} rel */
  function assertJsonLdSafe(html, rel) {
    const texts = extractJsonLdTexts(html);
    assert(texts.length > 0, `${rel} missing JSON-LD script`);
    for (const [index, text] of texts.entries()) {
      const label = texts.length === 1 ? rel : `${rel} JSON-LD #${index + 1}`;
      assert(
        !text.includes("</script") && !text.includes("<script"),
        `${label} JSON-LD must not contain raw script tags`,
      );
      try {
        const parsed = JSON.parse(text);
        assert(
          typeof parsed === "object" && parsed !== null && !Array.isArray(parsed),
          `${label} JSON-LD must parse to a non-null object (double-encoded JSON produces a string)`,
        );
      } catch (error) {
        assert(false, `${label} JSON-LD is not valid JSON: ${error.message}`);
      }
    }
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

  return {
    publicDir,
    siteHost,
    failures,
    assert,
    publicPath,
    getAttribute,
    getTagAttribute,
    readPublic,
    exists,
    findFirstFile,
    listFiles,
    extractJsonLdTexts,
    assertJsonLdSafe,
    isArticleHtml,
    findSamplePostHtml,
  };
}
