/**
 * 静态约定检查：把 AGENTS.md「代码写法约定」里可机器判定的硬规则变成断言。
 * 不依赖构建产物，可在 npm ci 之后立即运行；CI 中排在 Build site 之前。
 * 只有「改代码就能修」的规则才放进来；风格建议（如双引号优先）属软约定，不检查。
 *
 * 用法：node scripts/check-conventions.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { splitFrontMatter } from "./lib/frontmatter.mjs";

const root = resolve(import.meta.dirname, "..");

/** 参与文件层检查的目录（相对仓库根）。 */
const TEXT_DIRS = ["assets/js", "assets/scss", "layouts", "scripts", "config"];

/** Concat 成同一个 module 的三个文件：顶层标识符必须互不重名。 */
const CONCAT_FILES = ["assets/js/theme.js", "assets/js/navigation.js", "assets/js/scroll-ui.js"];

/** 文章 front matter 必填字段。 */
const POST_REQUIRED_FIELDS = ["title", "date", "slug", "description", "tags"];

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
  console.error("check-conventions: FAILED");
  for (const f of failures) {
    console.error(`  ✗ ${f}`);
  }
  process.exit(1);
}

/**
 * 递归列出目录下的文件（相对仓库根，正斜杠）。
 * @param {string} relDir
 * @returns {string[]}
 */
function listFiles(relDir) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} rel */
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(child);
      } else if (entry.isFile()) {
        out.push(child);
      }
    }
  };
  walk(relDir);
  return out;
}

/** @param {string} rel @returns {string} */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

/**
 * 逐行定位，便于输出「文件:行号」。
 * @param {string} rel @param {RegExp} pattern @param {string} label
 * @param {(line: string) => boolean} [skip]
 */
function assertNoLineMatch(rel, pattern, label, skip) {
  const lines = read(rel).split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (skip && skip(line)) {
      continue;
    }
    if (pattern.test(line)) {
      failures.push(`${rel}:${i + 1}: ${label}`);
    }
  }
}

/** 统一换行、缩进字符与文件末换行。markdown 允许行尾空格（硬换行语义）。 */
function checkFileHygiene() {
  const files = TEXT_DIRS.flatMap(listFiles);
  for (const rel of files) {
    const text = read(rel);
    assert(!text.includes("\r"),`${rel}: 含 CRLF，应为 LF`);
    assert(!text.includes("\t"), `${rel}: 含制表符，应使用空格`);
    assert(text.endsWith("\n"), `${rel}: 文件末缺换行`);
    if (!rel.endsWith(".md")) {
      const bad = text.split("\n").findIndex((line) => /[ \t]+$/.test(line));
      assert(bad === -1, `${rel}:${bad + 1}: 行尾多余空白`);
    }
  }
}

/** assets/js：禁用 var（module 内）与 "use strict"。 */
function checkScripts() {
  for (const rel of listFiles("assets/js")) {
    if (!rel.endsWith(".js")) {
      continue;
    }
    assertNoLineMatch(rel, /^\s+var\s/, "使用了 var，应为 const / let");
    assertNoLineMatch(rel, /["']use strict["']/, "module 已 strict，不应写 use strict");
  }
}

/** Concat 三文件共用顶层作用域，标识符不得重名。 */
function checkConcatScope() {
  /** @type {Map<string, string[]>} */
  const owners = new Map();
  const decl = /^(?:const|let|function|class)\s+([A-Za-z0-9_$]+)/gm;

  for (const rel of CONCAT_FILES) {
    const text = read(rel);
    for (const match of text.matchAll(decl)) {
      const name = match[1];
      const line = text.slice(0, match.index).split("\n").length;
      const ref = `${rel}:${line}`;
      const prev = owners.get(name) ?? [];
      owners.set(name, [...prev, ref]);
    }
  }

  for (const [name, refs] of owners) {
    assert(
      refs.length === 1,
      `Concat 顶层标识符 "${name}" 重复声明：${refs.join(" / ")}（三文件共用同一作用域）`,
    );
  }
}

/** assets/scss：只用 @use / @forward；自有 class 禁 __ BEM。 */
function checkStyles() {
  for (const rel of listFiles("assets/scss")) {
    if (!rel.endsWith(".scss")) {
      continue;
    }
    assertNoLineMatch(rel, /^\s*@import\b/, "使用了 @import，应为 @use / @forward");
    assertNoLineMatch(
      rel,
      /^\s*\.[a-z0-9-]+__/,
      "自有 class 使用了 __ BEM，应为连字符",
      (line) => line.includes("pagefind-ui__"),
    );
  }
}

/** content：文章必填字段、slug 与目录名一致、禁 categories / lastmod / toc: true。 */
function checkContent() {
  for (const rel of listFiles("content")) {
    if (!rel.endsWith(".md")) {
      continue;
    }
    const split = splitFrontMatter(read(rel));
    if (split === null) {
      failures.push(`${rel}: 缺少 front matter`);
      continue;
    }
    const fm = split.fm;
    assert(!/^categories:/m.test(fm), `${rel}: 禁止 categories（taxonomy 仅 tags）`);
    assert(!/^lastmod:/m.test(fm), `${rel}: 禁止 lastmod，日期只使用 date`);

    const isPost = /^content\/post\/[^/]+\/index\.md$/.test(rel);
    if (!isPost) {
      continue;
    }
    for (const field of POST_REQUIRED_FIELDS) {
      assert(new RegExp(`^${field}:`, "m").test(fm), `${rel}: 缺少必填字段 ${field}`);
    }
    assert(!/^toc:\s*true\s*$/m.test(fm), `${rel}: 文章 TOC 默认开，勿写 toc: true`);
    const slug = fm.match(/^slug:\s*"([^"]*)"/m)?.[1];
    const dir = rel.split("/")[2];
    assert(slug === dir, `${rel}: slug "${slug}" 与目录名 "${dir}" 不一致`);
  }
}

function main() {
  checkFileHygiene();
  checkScripts();
  checkConcatScope();
  checkStyles();
  checkContent();
  exitIfFailed();
  console.log("check-conventions: ok");
}

main();
