/**
 * 规范化 content front matter 字段序。
 * 文章丢掉 toc: true / lastmod；去掉 categories；键序对齐 AGENTS / archetypes。
 * 字段间注释挂到其后第一个键随排序搬运；尾随注释与块标量逐字保留。
 *
 * 解析与重排逻辑在 scripts/lib/frontmatter.mjs（可单测）。
 *
 * 用法：node scripts/normalize-frontmatter.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import {
  PAGE_ORDER,
  POST_ORDER,
  parseBlocks,
  rebuild,
  splitFrontMatter,
} from "./lib/frontmatter.mjs";

const root = join(import.meta.dirname, "..");
const contentRoot = join(root, "content");

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
