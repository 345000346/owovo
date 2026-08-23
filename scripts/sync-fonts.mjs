/**
 * 从 Fontsource 包同步自托管字体。
 *
 * 策略（不做全站码点扫描）：
 * - 拷贝 Noto Serif SC variable 的 index.css 中全部 @font-face（latin + 全部 CJK 分片）
 * - 始终附带 Source Code Pro latin 400/700 normal+italic
 * - preload：latin + 固定 CJK 白名单（包内缺失则跳过）
 *
 * 产出：
 * - static/fonts/*.woff2
 * - assets/css/fonts.css
 * - data/font_preload.json
 *
 * 用法：node scripts/sync-fonts.mjs [--stats]
 * 环境变量：SYNC_FONTS_STATS=1 等价于 --stats
 */
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
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
// 关键路径 CJK 分片（无内容扫描）。119 为首页 LCP 主力切片，117/118/116 覆盖
// 首屏导航与标题用字（缺 116 时标题局部字形晚到）；仅在 Fontsource 改名子集时更新。
const PRELOAD_CJK_FILES = [
  "noto-serif-sc-119-wght-normal.woff2",
  "noto-serif-sc-118-wght-normal.woff2",
  "noto-serif-sc-117-wght-normal.woff2",
  "noto-serif-sc-116-wght-normal.woff2",
];
const PRELOAD_TOTAL_MAX = 5; // latin + 至多 4 个 CJK

// Source Code Pro 固定附带 latin 400/700 normal+italic。
const SOURCE_CODE_FILES = [
  "source-code-pro-latin-400-normal.woff2",
  "source-code-pro-latin-400-italic.woff2",
  "source-code-pro-latin-700-normal.woff2",
  "source-code-pro-latin-700-italic.woff2",
];
const wantStats =
  process.argv.includes("--stats") || process.env.SYNC_FONTS_STATS === "1";

/**
 * 以 Fontsource CSS 为真源：取出全部 @font-face，收集 woff2 基名。
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
    throw new Error("sync-fonts: Noto index.css 中未找到 @font-face");
  }

  return faces;
}

/** @param {string[]} blocks 族名与 url 改写到本站 /fonts/ */
function rewriteNotoCss(blocks) {
  return blocks
    .join("\n\n")
    .replaceAll("'Noto Serif SC Variable'", '"Noto Serif SC"')
    .replaceAll("url(./files/", 'url("/fonts/')
    .replaceAll(".woff2) format", '.woff2") format');
}

/**
 * 拷贝全部 woff2 到暂存目录；全部成功后由调用方原子替换正式目录。
 * @param {string} stagingDirectory
 * @returns {Promise<{ faces: { block: string, file: string, isLatin: boolean }[], notoSizes: Map<string, number>, copiedBytes: number }>}
 */
async function stageFonts(stagingDirectory) {
  await rm(stagingDirectory, { force: true, recursive: true });
  await mkdir(stagingDirectory, { recursive: true });

  const vendorCss = await readFile(resolve(notoSource, "index.css"), "utf8");
  const faces = collectNotoFaces(vendorCss);

  /** @type {Map<string, number>} */
  const notoSizes = new Map();
  let copiedBytes = 0;
  const notoFilesDir = resolve(notoSource, "files");

  for (const { file: name } of faces) {
    const source = resolve(notoFilesDir, name);
    await cp(source, resolve(stagingDirectory, name));
    const size = (await stat(source)).size;
    notoSizes.set(name, size);
    copiedBytes += size;
  }

  for (const file of SOURCE_CODE_FILES) {
    const source = resolve(sourceCodeSource, file);
    await cp(source, resolve(stagingDirectory, file));
    copiedBytes += (await stat(source)).size;
  }

  return { faces, notoSizes, copiedBytes };
}

async function main() {
  // 先写仓库根暂存目录再整体替换：失败清理暂存且不破坏既有 static/fonts；
  // 暂存目录不在 static/ 下，Hugo 不会把它当静态文件发布。
  const stagingDirectory = resolve(root, ".fonts-staging");
  let stageResult;
  try {
    stageResult = await stageFonts(stagingDirectory);
    await rm(fontDirectory, { force: true, recursive: true });
    await rename(stagingDirectory, fontDirectory);
  } catch (error) {
    await rm(stagingDirectory, { force: true, recursive: true }).catch(() => {});
    throw error;
  }
  await mkdir(cssDirectory, { recursive: true });
  await mkdir(resolve(root, "data"), { recursive: true });

  const { faces, notoSizes, copiedBytes } = stageResult;

  const sourceCodeCss = SOURCE_CODE_FILES
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

  // 关键路径：latin + 固定 CJK 白名单；其余 CJK 仍靠 unicode-range 按需加载。
  const faceFiles = new Set(faces.map((f) => f.file));
  const latinFiles = faces.filter((f) => f.isLatin).map((f) => f.file);
  if (latinFiles.length === 0) {
    throw new Error("sync-fonts: Noto index.css 缺少 latin 子集");
  }
  const preloadCjk = PRELOAD_CJK_FILES.filter((name) => faceFiles.has(name));
  const preloadFiles = [...latinFiles, ...preloadCjk].slice(
    0,
    PRELOAD_TOTAL_MAX,
  );
  const preloadBytes = preloadFiles.reduce(
    (sum, f) => sum + (notoSizes.get(f) || 0),
    0,
  );

  // 生成物 — 勿手改 data/font_preload.json。
  await writeFile(
    preloadDataPath,
    `${JSON.stringify({ files: preloadFiles }, null, 2)}\n`,
  );

  const mb = (copiedBytes / 1024 / 1024).toFixed(2);
  const preloadMb = (preloadBytes / 1024 / 1024).toFixed(2);
  const latinCount = faces.filter((f) => f.isLatin).length;
  const cjkCount = faces.length - latinCount;
  console.log(
    `sync-fonts: ${faces.length} Noto faces (latin=${latinCount}, cjk=${cjkCount}) + ${SOURCE_CODE_FILES.length} Source Code Pro (${mb} MB)`,
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
}

main().catch((error) => {
  console.error("sync-fonts:", error);
  process.exit(1);
});
