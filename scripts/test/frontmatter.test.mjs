/**
 * scripts/lib/frontmatter.mjs 的单元测试（node --test，零依赖）。
 *
 * 用法：node --test scripts/test/
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PAGE_ORDER,
  POST_ORDER,
  parseBlocks,
  rebuild,
  splitFrontMatter,
} from "../lib/frontmatter.mjs";

test("splitFrontMatter 切出 fm 与正文，正文逐字保留", () => {
  const text = "---\ntitle: a\n---\n\n正文\n";
  const split = splitFrontMatter(text);
  assert.equal(split.fm, "title: a");
  assert.equal(split.body, "\n正文\n");
});

test("splitFrontMatter 兼容 CRLF", () => {
  const text = "---\r\ntitle: a\r\n---\r\nbody";
  const split = splitFrontMatter(text);
  assert.equal(split.fm, "title: a");
  assert.equal(split.body, "body");
});

test("splitFrontMatter 对缺失/未闭合的 front matter 返回 null", () => {
  assert.equal(splitFrontMatter("# 无 FM\n"), null);
  assert.equal(splitFrontMatter("---\ntitle: a\n"), null);
});

test("parseBlocks 把多行缩进值与块标量空行归到同一个键", () => {
  const fm = ["title: a", "tags:", "  - x", "body: |", "  第一行", "", "  第二行", "draft: false"].join("\n");
  const blocks = parseBlocks(fm);
  const keys = blocks.map((b) => b.key);
  assert.deepEqual(keys, ["title", "tags", "body", "draft"]);
  assert.equal(blocks[2].raw, "body: |\n  第一行\n\n  第二行");
});

test("rebuild 按 order 排序并丢弃 categories / lastmod", () => {
  const fm = ["categories: [x]", "lastmod: 2024-01-01", "title: a", "slug: s"].join("\n");
  const out = rebuild(parseBlocks(fm), POST_ORDER, true);
  assert.equal(out, "title: a\nslug: s\n");
});

test("rebuild 在文章侧丢弃 toc: true，但保留 toc: false", () => {
  const on = rebuild(parseBlocks("title: a\ntoc: true\n"), POST_ORDER, true);
  assert.equal(on, "title: a\n");

  const off = rebuild(parseBlocks("title: a\ntoc: false\n"), POST_ORDER, true);
  assert.equal(off, "title: a\ntoc: false\n");
});

test("rebuild 在普通页保留 toc: true（页面 TOC 是 opt-in）", () => {
  const out = rebuild(parseBlocks("title: a\ntoc: true\n"), PAGE_ORDER, false);
  assert.equal(out, "title: a\ntoc: true\n");
});

test("rebuild 把字段间注释搬到其后第一个键之前", () => {
  const fm = ["b: 1", "# 说明 a", "a: 2"].join("\n");
  const out = rebuild(parseBlocks(fm), ["a", "b"], false);
  assert.equal(out, "# 说明 a\na: 2\nb: 1\n");
});

test("rebuild 保留未被任何键收留的尾随注释", () => {
  const fm = ["a: 1", "# 尾注"].join("\n");
  const out = rebuild(parseBlocks(fm), ["a"], false);
  assert.equal(out, "a: 1\n# 尾注\n");
});

test("rebuild 输出恰好一个结尾换行（幂等的前提）", () => {
  const out = rebuild(parseBlocks("title: a\n\n\n"), POST_ORDER, true);
  assert.equal(out, "title: a\n");
});
