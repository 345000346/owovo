import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const notoSource = resolve(
  root,
  "node_modules/@fontsource-variable/noto-serif-sc",
);
const sourceCodeSource = resolve(
  root,
  "node_modules/@fontsource/source-code-pro/files",
);
const fontDirectory = resolve(root, "static/fonts");
const cssDirectory = resolve(root, "assets/css");

// Visible copy only — not assets source that is mostly ASCII.
const SCAN_ROOTS = ["content", "layouts", "config", "data"];
const SCAN_EXTS = new Set([".md", ".html", ".toml", ".yaml", ".yml", ".txt"]);
// Always ship basic Latin so UI chrome and English snippets never fall back.
const ALWAYS_FILE = /-(?:latin|latin-ext)-wght-normal\.woff2$/;
const FACE_BLOCK = /(?:\/\*[\s\S]*?\*\/\s*)?@font-face\s*\{[^}]*\}/g;

async function walkFiles(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, acc);
      continue;
    }
    if (SCAN_EXTS.has(extname(entry.name).toLowerCase())) {
      acc.push(fullPath);
    }
  }
  return acc;
}

async function collectSiteCodePoints() {
  const chars = new Set();
  for (const rel of SCAN_ROOTS) {
    for (const file of await walkFiles(resolve(root, rel))) {
      const text = await readFile(file, "utf8");
      for (const ch of text) {
        chars.add(ch.codePointAt(0));
      }
    }
  }
  return chars;
}

/** Parse `U+xxxx` / `U+aaaa-U+bbbb` lists into closed intervals (no expansion). */
function parseIntervals(rangeStr) {
  const intervals = [];
  for (const part of rangeStr.split(",")) {
    const token = part.trim();
    const rangeMatch = token.match(/^U\+([0-9A-Fa-f]+)-([0-9A-Fa-f]+)$/i);
    if (rangeMatch) {
      intervals.push([
        Number.parseInt(rangeMatch[1], 16),
        Number.parseInt(rangeMatch[2], 16),
      ]);
      continue;
    }
    const singleMatch = token.match(/^U\+([0-9A-Fa-f]+)$/i);
    if (singleMatch) {
      const cp = Number.parseInt(singleMatch[1], 16);
      intervals.push([cp, cp]);
    }
  }
  return intervals;
}

function rangeHits(rangeStr, siteChars) {
  const intervals = parseIntervals(rangeStr);
  for (const cp of siteChars) {
    for (const [start, end] of intervals) {
      if (cp >= start && cp <= end) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Keep Fontsource as the CSS source of truth: filter @font-face blocks by
 * site code points (plus latin / latin-ext), and collect the woff2 files.
 */
function filterNotoFaces(vendorCss, siteChars) {
  const keptBlocks = [];
  const files = new Set();

  for (const match of vendorCss.matchAll(FACE_BLOCK)) {
    const block = match[0];
    const fileMatch = block.match(/url\(\.\/files\/([^)\s]+\.woff2)\)/);
    const rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
    if (!fileMatch || !rangeMatch) {
      continue;
    }

    const file = fileMatch[1];
    if (ALWAYS_FILE.test(file) || rangeHits(rangeMatch[1].trim(), siteChars)) {
      keptBlocks.push(block);
      files.add(file);
    }
  }

  if (files.size === 0) {
    throw new Error("sync-fonts: no Noto subsets matched site content");
  }

  return { blocks: keptBlocks, files };
}

function rewriteNotoCss(blocks) {
  return blocks
    .join("\n\n")
    .replaceAll("'Noto Serif SC Variable'", '"Noto Serif SC"')
    .replaceAll("url(./files/", 'url("/fonts/')
    .replaceAll(".woff2) format", '.woff2") format');
}

await rm(fontDirectory, { force: true, recursive: true });
await mkdir(fontDirectory, { recursive: true });
await mkdir(cssDirectory, { recursive: true });

const siteChars = await collectSiteCodePoints();
const vendorCss = await readFile(resolve(notoSource, "index.css"), "utf8");
const { blocks, files: notoFiles } = filterNotoFaces(vendorCss, siteChars);

let copiedBytes = 0;
const notoFilesDir = resolve(notoSource, "files");
for (const name of notoFiles) {
  const source = resolve(notoFilesDir, name);
  await cp(source, resolve(fontDirectory, name));
  copiedBytes += (await stat(source)).size;
}

const sourceCodeFiles = [
  "source-code-pro-latin-400-normal.woff2",
  "source-code-pro-latin-400-italic.woff2",
  "source-code-pro-latin-700-normal.woff2",
  "source-code-pro-latin-700-italic.woff2",
];

for (const file of sourceCodeFiles) {
  const source = resolve(sourceCodeSource, file);
  await cp(source, resolve(fontDirectory, file));
  copiedBytes += (await stat(source)).size;
}

const sourceCodeCss = sourceCodeFiles
  .map((file) => {
    const [, weight, style] = file.match(/-(400|700)-(normal|italic)\.woff2$/);
    return `@font-face {
  font-family: "Source Code Pro";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("/fonts/${file}") format("woff2");
}`;
  })
  .join("\n\n");

await writeFile(
  resolve(cssDirectory, "fonts.css"),
  `${rewriteNotoCss(blocks)}\n\n${sourceCodeCss}\n`,
);

const mb = (copiedBytes / 1024 / 1024).toFixed(2);
console.log(
  `sync-fonts: ${notoFiles.size} Noto subsets + ${sourceCodeFiles.length} Source Code Pro files (${mb} MB)`,
);
