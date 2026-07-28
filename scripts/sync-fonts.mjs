/**
 * Sync self-hosted fonts from Fontsource packages.
 *
 * Policy (no site-wide code-point scan):
 * - Copy every @font-face from Noto Serif SC variable index.css (latin + all CJK chunks)
 * - Always ship Source Code Pro latin 400/700 normal+italic
 * - Preload: latin + fixed CJK whitelist (if present in the package)
 *
 * Outputs:
 * - static/fonts/*.woff2
 * - assets/css/fonts.css
 * - data/font_preload.json
 */
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

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

const FACE_BLOCK = /(?:\/\*[\s\S]*?\*\/\s*)?@font-face\s*\{[^}]*\}/g;
const LATIN_FILE = /-latin-wght-normal\.woff2$/;
// Fixed critical-path CJK chunks (no content scan). Update only when Fontsource
// renames subsets; missing names are skipped quietly.
const PRELOAD_CJK_FILES = [
  "noto-serif-sc-119-wght-normal.woff2",
  "noto-serif-sc-118-wght-normal.woff2",
  "noto-serif-sc-117-wght-normal.woff2",
];
const PRELOAD_TOTAL_MAX = 4; // latin + up to 3 CJK
const wantStats =
  process.argv.includes("--stats") || process.env.SYNC_FONTS_STATS === "1";

/**
 * Keep Fontsource as CSS source of truth: take all @font-face blocks,
 * rewrite family name + url to /fonts/, collect woff2 basenames.
 * @param {string} vendorCss
 */
function collectNotoFaces(vendorCss) {
  /** @type {{ block: string, file: string, isLatin: boolean }[]} */
  const faces = [];

  for (const match of vendorCss.matchAll(FACE_BLOCK)) {
    const block = match[0];
    const fileMatch = block.match(/url\(\.\/files\/([^)\s]+\.woff2)\)/);
    if (!fileMatch) {
      continue;
    }
    const file = fileMatch[1];
    faces.push({
      block,
      file,
      isLatin: LATIN_FILE.test(file),
    });
  }

  if (faces.length === 0) {
    throw new Error("sync-fonts: no @font-face blocks in Noto index.css");
  }

  return faces;
}

/** @param {string[]} blocks */
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
await mkdir(resolve(root, "data"), { recursive: true });

const vendorCss = await readFile(resolve(notoSource, "index.css"), "utf8");
const faces = collectNotoFaces(vendorCss);

/** @type {Map<string, number>} */
const notoSizes = new Map();
let copiedBytes = 0;
const notoFilesDir = resolve(notoSource, "files");

for (const { file: name } of faces) {
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

await writeFile(
  resolve(cssDirectory, "fonts.css"),
  `${rewriteNotoCss(faces.map((f) => f.block))}\n\n${sourceCodeCss}\n`,
);

// Critical path: latin + fixed CJK whitelist. Remaining CJK still on-demand via unicode-range.
const faceFiles = new Set(faces.map((f) => f.file));
const latinFiles = faces.filter((f) => f.isLatin).map((f) => f.file);
if (latinFiles.length === 0) {
  throw new Error("sync-fonts: latin subset missing from Noto index.css");
}
const preloadCjk = PRELOAD_CJK_FILES.filter((name) => faceFiles.has(name));
const preloadFiles = [...latinFiles, ...preloadCjk].slice(0, PRELOAD_TOTAL_MAX);
const preloadBytes = preloadFiles.reduce(
  (sum, f) => sum + (notoSizes.get(f) || 0),
  0,
);

// Generated artifact — do not hand-edit data/font_preload.json.
await writeFile(
  preloadDataPath,
  `${JSON.stringify({ files: preloadFiles }, null, 2)}\n`,
);

const mb = (copiedBytes / 1024 / 1024).toFixed(2);
const preloadMb = (preloadBytes / 1024 / 1024).toFixed(2);
const latinCount = faces.filter((f) => f.isLatin).length;
const cjkCount = faces.length - latinCount;
console.log(
  `sync-fonts: ${faces.length} Noto faces (latin=${latinCount}, cjk=${cjkCount}) + ${sourceCodeFiles.length} Source Code Pro (${mb} MB)`,
);
console.log(
  `sync-fonts: preload ${preloadFiles.length} file(s) (${preloadMb} MB): ${preloadFiles.join(", ")}`,
);

if (wantStats) {
  const onDisk = await readdir(fontDirectory);
  console.log("sync-fonts stats:");
  console.log(`  files in static/fonts: ${onDisk.length}`);
  console.log("  Noto by size (desc, top 8 CJK):");
  const cjkSorted = faces
    .filter((f) => !f.isLatin)
    .slice()
    .sort(
      (a, b) => (notoSizes.get(b.file) || 0) - (notoSizes.get(a.file) || 0),
    );
  for (const row of cjkSorted.slice(0, 8)) {
    const sizeKb = ((notoSizes.get(row.file) || 0) / 1024).toFixed(0);
    console.log(`    ${sizeKb}KB ${row.file}`);
  }
}
