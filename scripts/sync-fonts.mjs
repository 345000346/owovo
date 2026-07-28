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
const preloadDataPath = resolve(root, "data/font_preload.json");

// Visible copy only — not assets source that is mostly ASCII.
const SCAN_ROOTS = ["content", "layouts", "config", "data"];
const SCAN_EXTS = new Set([".md", ".html", ".toml", ".yaml", ".yml", ".txt"]);
// Always ship basic Latin so brand / English snippets never fall back.
// latin-ext is NOT forced: include only when site code points hit its range.
const ALWAYS_FILE = /-(?:latin)-wght-normal\.woff2$/;
const FACE_BLOCK = /(?:\/\*[\s\S]*?\*\/\s*)?@font-face\s*\{[^}]*\}/g;
// Critical-path preloads: latin + top CJK subsets by content frequency (keep small).
const PRELOAD_CJK_MAX = 2;
const PRELOAD_TOTAL_MAX = 3;
const wantStats =
  process.argv.includes("--stats") || process.env.SYNC_FONTS_STATS === "1";

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

/**
 * @returns {Promise<{ chars: Set<number>, freq: Map<number, number>, perRoot: Map<string, number> }>}
 */
async function collectSiteCodePoints() {
  const chars = new Set();
  /** @type {Map<number, number>} */
  const freq = new Map();
  /** @type {Map<string, number>} */
  const perRoot = new Map();

  for (const rel of SCAN_ROOTS) {
    let rootChars = 0;
    for (const file of await walkFiles(resolve(root, rel))) {
      const text = await readFile(file, "utf8");
      for (const ch of text) {
        const cp = ch.codePointAt(0);
        chars.add(cp);
        freq.set(cp, (freq.get(cp) || 0) + 1);
        rootChars += 1;
      }
    }
    perRoot.set(rel, rootChars);
  }
  return { chars, freq, perRoot };
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

/**
 * @param {string} rangeStr
 * @param {Set<number>} siteChars
 * @param {Map<number, number>} freq
 */
function rangeStats(rangeStr, siteChars, freq) {
  const intervals = parseIntervals(rangeStr);
  let hitCodepoints = 0;
  let hitWeight = 0;
  for (const cp of siteChars) {
    for (const [start, end] of intervals) {
      if (cp >= start && cp <= end) {
        hitCodepoints += 1;
        hitWeight += freq.get(cp) || 1;
        break;
      }
    }
  }
  return { hitCodepoints, hitWeight, hits: hitCodepoints > 0 };
}

/**
 * Keep Fontsource as the CSS source of truth: filter @font-face blocks by
 * site code points (plus forced latin), and collect the woff2 files.
 *
 * @param {string} vendorCss
 * @param {Set<number>} siteChars
 * @param {Map<number, number>} freq
 */
function filterNotoFaces(vendorCss, siteChars, freq) {
  /** @type {{ block: string, file: string, always: boolean, hitWeight: number, hitCodepoints: number, size?: number }[]} */
  const kept = [];

  for (const match of vendorCss.matchAll(FACE_BLOCK)) {
    const block = match[0];
    const fileMatch = block.match(/url\(\.\/files\/([^)\s]+\.woff2)\)/);
    const rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
    if (!fileMatch || !rangeMatch) {
      continue;
    }

    const file = fileMatch[1];
    const always = ALWAYS_FILE.test(file);
    const stats = rangeStats(rangeMatch[1].trim(), siteChars, freq);
    if (!always && !stats.hits) {
      continue;
    }

    kept.push({
      block,
      file,
      always,
      hitWeight: always ? Number.MAX_SAFE_INTEGER : stats.hitWeight,
      hitCodepoints: stats.hitCodepoints,
    });
  }

  if (kept.length === 0) {
    throw new Error("sync-fonts: no Noto subsets matched site content");
  }

  const files = new Set(kept.map((k) => k.file));
  return { kept, files };
}

function rewriteNotoCss(blocks) {
  return blocks
    .join("\n\n")
    .replaceAll("'Noto Serif SC Variable'", '"Noto Serif SC"')
    .replaceAll("url(./files/", 'url("/fonts/')
    .replaceAll(".woff2) format", '.woff2") format');
}

/**
 * Pick a small critical-path preload set: forced latin + top CJK by frequency.
 * @param {{ file: string, always: boolean, hitWeight: number }[]} kept
 * @param {Map<string, number>} sizes
 */
function selectPreloads(kept, sizes) {
  const latin = kept.filter((k) => k.always).map((k) => k.file);
  const cjkRanked = kept
    .filter((k) => !k.always)
    .slice()
    .sort((a, b) => b.hitWeight - a.hitWeight || a.file.localeCompare(b.file));
  const cjk = cjkRanked.slice(0, PRELOAD_CJK_MAX).map((k) => k.file);
  const files = [...latin, ...cjk].slice(0, PRELOAD_TOTAL_MAX);
  const bytes = files.reduce((sum, f) => sum + (sizes.get(f) || 0), 0);
  return { files, bytes };
}

await rm(fontDirectory, { force: true, recursive: true });
await mkdir(fontDirectory, { recursive: true });
await mkdir(cssDirectory, { recursive: true });
await mkdir(resolve(root, "data"), { recursive: true });

const { chars: siteChars, freq, perRoot } = await collectSiteCodePoints();
const vendorCss = await readFile(resolve(notoSource, "index.css"), "utf8");
const { kept, files: notoFiles } = filterNotoFaces(vendorCss, siteChars, freq);

/** @type {Map<string, number>} */
const notoSizes = new Map();
let copiedBytes = 0;
const notoFilesDir = resolve(notoSource, "files");
for (const name of notoFiles) {
  const source = resolve(notoFilesDir, name);
  await cp(source, resolve(fontDirectory, name));
  const size = (await stat(source)).size;
  notoSizes.set(name, size);
  copiedBytes += size;
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

const notoBlocks = kept.map((k) => k.block);
await writeFile(
  resolve(cssDirectory, "fonts.css"),
  `${rewriteNotoCss(notoBlocks)}\n\n${sourceCodeCss}\n`,
);

const preload = selectPreloads(kept, notoSizes);
await writeFile(
  preloadDataPath,
  `${JSON.stringify(
    {
      // Generated by scripts/sync-fonts.mjs — do not edit.
      files: preload.files,
    },
    null,
    2,
  )}\n`,
);

const mb = (copiedBytes / 1024 / 1024).toFixed(2);
const preloadMb = (preload.bytes / 1024 / 1024).toFixed(2);
const alwaysCount = kept.filter((k) => k.always).length;
console.log(
  `sync-fonts: ${notoFiles.size} Noto subsets (always latin=${alwaysCount}) + ${sourceCodeFiles.length} Source Code Pro files (${mb} MB)`,
);
console.log(
  `sync-fonts: preload ${preload.files.length} files (${preloadMb} MB): ${preload.files.join(", ")}`,
);

if (wantStats) {
  console.log("sync-fonts stats:");
  console.log(`  unique code points: ${siteChars.size}`);
  for (const [rel, n] of perRoot) {
    console.log(`  scanned chars in ${rel}/: ${n}`);
  }
  const ranked = kept
    .filter((k) => !k.always)
    .slice()
    .sort((a, b) => b.hitWeight - a.hitWeight);
  console.log("  top CJK subsets by content frequency:");
  for (const row of ranked.slice(0, 8)) {
    const sizeKb = ((notoSizes.get(row.file) || 0) / 1024).toFixed(0);
    console.log(
      `    ${sizeKb}KB weight=${row.hitWeight} cps=${row.hitCodepoints} ${row.file}`,
    );
  }
}
