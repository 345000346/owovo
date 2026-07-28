/**
 * One-shot / maintenance: normalize content front matter field order.
 * - Posts: drop toc: true (default on); keep toc: false
 * - Drop categories
 * - Stable key order
 *
 * Usage: node scripts/normalize-frontmatter.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const contentRoot = join(root, "content");

const POST_ORDER = [
  "title",
  "date",
  "lastmod",
  "slug",
  "description",
  "tags",
  "toc",
  "source",
  "author",
  "outdated",
  "outdatedNote",
  "draft",
];

const PAGE_ORDER = [
  "title",
  "date",
  "lastmod",
  "description",
  "type",
  "layout",
  "toc",
  "slug",
  "tags",
  "draft",
  "sitemap",
];

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listMarkdownFiles(dir) {
  /** @type {string[]} */
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listMarkdownFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} text
 * @returns {{ fm: string, body: string } | null}
 */
function splitFrontMatter(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return null;
  }
  const start = text.startsWith("---\r\n") ? 5 : 4;
  const endMatch = text.slice(start).match(/\r?\n---\r?\n/);
  if (!endMatch || endMatch.index === undefined) {
    return null;
  }
  const fm = text.slice(start, start + endMatch.index);
  const body = text.slice(start + endMatch.index + endMatch[0].length);
  return { fm, body };
}

/**
 * @param {string} fmBody
 * @returns {{ key: string | null, raw: string }[]}
 */
function parseBlocks(fmBody) {
  const lines = fmBody.split(/\r?\n/);
  /** @type {{ key: string | null, raw: string }[]} */
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      blocks.push({ key: null, raw: line });
      i += 1;
      continue;
    }
    const km = line.match(/^([A-Za-z0-9_]+)\s*:/);
    if (!km) {
      blocks.push({ key: null, raw: line });
      i += 1;
      continue;
    }
    const key = km[1];
    /** @type {string[]} */
    const chunk = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i].startsWith(" ") || lines[i].startsWith("\t"))
    ) {
      chunk.push(lines[i]);
      i += 1;
    }
    blocks.push({ key, raw: chunk.join("\n") });
  }
  return blocks;
}

/**
 * @param {{ key: string | null, raw: string }[]} blocks
 * @param {string[]} order
 * @param {boolean} isPost
 */
function rebuild(blocks, order, isPost) {
  /** @type {Map<string, string>} */
  const byKey = new Map();
  /** @type {string[]} */
  const leadingComments = [];

  for (const block of blocks) {
    if (block.key === null) {
      if (byKey.size === 0 && block.raw.trimStart().startsWith("#")) {
        leadingComments.push(block.raw);
      }
      continue;
    }
    if (block.key === "categories") {
      continue;
    }
    if (isPost && block.key === "toc") {
      const value = block.raw.split(":").slice(1).join(":").trim().toLowerCase();
      if (value === "true" || value === "yes" || value === "1") {
        continue;
      }
    }
    byKey.set(block.key, block.raw);
  }

  /** @type {string[]} */
  const out = [...leadingComments];
  for (const key of order) {
    if (byKey.has(key)) {
      out.push(byKey.get(key));
      byKey.delete(key);
    }
  }
  for (const raw of byKey.values()) {
    out.push(raw);
  }
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

/**
 * @param {string} filePath
 */
function isPostFile(filePath) {
  const rel = relative(contentRoot, filePath).replace(/\\/g, "/");
  return rel.startsWith("post/") && rel.endsWith("/index.md");
}

async function main() {
  const files = await listMarkdownFiles(contentRoot);
  let changed = 0;

  for (const filePath of files) {
    const text = await readFile(filePath, "utf8");
    const split = splitFrontMatter(text);
    if (!split) {
      continue;
    }

    const post = isPostFile(filePath);
    const order = post ? POST_ORDER : PAGE_ORDER;
    const newFm = rebuild(parseBlocks(split.fm), order, post);
    const next = `---\n${newFm}---\n${split.body}`;
    if (next !== text) {
      await writeFile(filePath, next, "utf8");
      changed += 1;
      console.log(`updated ${relative(root, filePath)}`);
    }
  }

  console.log(`normalize-frontmatter: ${changed} file(s) changed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
