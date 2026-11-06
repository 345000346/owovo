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

/** 系统偏好查询的唯一落点；其它 JS 只准 import 它，不准自建 matchMedia。 */
const MEDIA_QUERY_OWNER = "assets/js/lib/env.js";

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
    assert(!text.includes("\r"), `${rel}: 含 CRLF，应为 LF`);
    assert(!text.includes("\t"), `${rel}: 含制表符，应使用空格`);
    assert(text.endsWith("\n"), `${rel}: 文件末缺换行`);
    if (!rel.endsWith(".md")) {
      const bad = text.split("\n").findIndex((line) => /[ \t]+$/.test(line));
      assert(bad === -1, `${rel}:${bad + 1}: 行尾多余空白`);
    }
  }
}

/** assets/js：禁用 var 与 "use strict"；系统偏好查询只准集中在 lib/env.js。 */
function checkScripts() {
  const jsFiles = listFiles("assets/js");

  for (const rel of jsFiles) {
    if (!rel.endsWith(".js")) {
      continue;
    }
    assertNoLineMatch(rel, /^\s+var\s/, "使用了 var，应为 const / let");
    assertNoLineMatch(rel, /["']use strict["']/, "module 已 strict，不应写 use strict");
  }

  // 同一份偏好重复探测会漂移（导航用自建查询、主题用变量，reduced motion 曾三处不同实现）。
  for (const rel of jsFiles) {
    if (rel === MEDIA_QUERY_OWNER || !rel.endsWith(".js")) {
      continue;
    }
    assertNoLineMatch(
      rel,
      /prefers-(?:reduced-motion|color-scheme)\s*:/,
      `自建了系统偏好查询，应 import ${MEDIA_QUERY_OWNER}`,
    );
  }
}

/** index.js 导入的模块：作用域已由 ESM 隔离，它们只准导出，不准自启动。 */
const IMPORTED_MODULES = [
  "assets/js/theme.js",
  "assets/js/navigation.js",
  "assets/js/scroll-ui.js",
];

/**
 * 打包改成 ESM 后，只剩一条必须守住的约束：
 * 被 index.js import 的模块不能在顶层自调用，否则会被启动两次；
 * 它们必须 export 出 init 函数，由 index.js 决定顺序。
 * 独立入口（article.js / search-dialog.js / search-highlight.js）各自成包，允许顶层自调用。
 */
function checkModuleEntries() {
  for (const rel of IMPORTED_MODULES) {
    const text = read(rel);
    const topLevelCall = /^(?!\s)[A-Za-z_$][\w$]*\(\);\s*$/m.exec(text);
    assert(
      !topLevelCall,
      `${rel}: 顶层不应自调用（${topLevelCall?.[0].trim()}）；被 index.js import 后会启动两次`,
    );
    assert(
      /\bexport\s+(?:function|const|let|class)\s/.test(text),
      `${rel}: 应 export 出 init 函数供 index.js 调用`,
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
  checkModuleEntries();
  checkStyles();
  checkContent();
  exitIfFailed();
  console.log("check-conventions: ok");
}

main();
