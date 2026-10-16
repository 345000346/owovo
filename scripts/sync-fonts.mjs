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
 * - .fonts-manifest.json（增量判断依据；依赖/源未变时跳过拷贝，--force 强制重拷）
 *
 * 用法：node scripts/sync-fonts.mjs [--force] [--stats]
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
import { createHash } from "node:crypto";
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
const manifestPath = resolve(root, ".fonts-manifest.json");

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
const wantForce = process.argv.includes("--force");

/** @param {string} text @returns {string} sha256 hex 摘要 */
function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * 已安装字体包版本（node_modules 与 lockfile 精确锁定一致）。
 * @returns {Promise<string>}
 */
async function readPackageVersions() {
  const notoPkg = JSON.parse(
    await readFile(resolve(notoSource, "package.json"), "utf8"),
  );
  const sourceCodePkg = JSON.parse(
    await readFile(resolve(sourceCodeSource, "..", "package.json"), "utf8"),
  );
  return `${notoPkg.version ?? ""}|${sourceCodePkg.version ?? ""}`;
}

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

/** @returns {string} Source Code Pro 的 @font-face CSS（latin 400/700 normal+italic） */
function buildSourceCodeCss() {
  return SOURCE_CODE_FILES
    .map((file) => {
      const parts = file.match(/-(400|700)-(normal|italic)\.woff2$/);
      if (!parts) {
        throw new Error(`sync-fonts: 无法解析 Source Code Pro 文件名 ${file}`);
      }
      const [, weight, style] = parts;
      return `@font-face {
  font-family: "Source Code Pro";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("/fonts/${file}") format("woff2");
}`;
    })
    .join("\n\n");
}

/**
 * 关键路径 preload 文件：latin + 固定 CJK 白名单（其余 CJK 靠 unicode-range 按需）。
 * @param {{ file: string, isLatin: boolean }[]} faces
 * @returns {string[]}
 */
function computePreloadFiles(faces) {
  const faceFiles = new Set(faces.map((f) => f.file));
  const latinFiles = faces.filter((f) => f.isLatin).map((f) => f.file);
  if (latinFiles.length === 0) {
    throw new Error("sync-fonts: Noto index.css 缺少 latin 子集");
  }
  const preloadCjk = PRELOAD_CJK_FILES.filter((name) => faceFiles.has(name));
  return [...latinFiles, ...preloadCjk].slice(0, PRELOAD_TOTAL_MAX);
}

/**
 * 拷贝全部 woff2 到暂存目录；全部成功后由调用方原子替换正式目录。
 * @param {string} stagingDirectory
 * @param {{ block: string, file: string, isLatin: boolean }[]} faces
 * @returns {Promise<{ faces: { block: string, file: string, isLatin: boolean }[], fileSizes: Map<string, number>, copiedBytes: number }>}
 */
async function stageFonts(stagingDirectory, faces) {
  await rm(stagingDirectory, { force: true, recursive: true });
  await mkdir(stagingDirectory, { recursive: true });

  /** @type {Map<string, number>} */
  const fileSizes = new Map();
  let copiedBytes = 0;
  const notoFilesDir = resolve(notoSource, "files");

  for (const { file: name } of faces) {
    const source = resolve(notoFilesDir, name);
    await cp(source, resolve(stagingDirectory, name));
    const size = (await stat(source)).size;
    fileSizes.set(name, size);
    copiedBytes += size;
  }

  for (const file of SOURCE_CODE_FILES) {
    const source = resolve(sourceCodeSource, file);
    await cp(source, resolve(stagingDirectory, file));
    const size = (await stat(source)).size;
    fileSizes.set(file, size);
    copiedBytes += size;
  }

  return { faces, fileSizes, copiedBytes };
}

/** @returns {Promise<{ key?: string, cssHash?: string, preloadHash?: string, files?: { name: string, size: number }[] } | null>} */
async function loadManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * 现有产物与期望输入的一致性校验：manifest key、磁盘上的 fonts.css 与
 * preload JSON 字节摘要、每个字体文件存在且体积一致。全部通过返回文件
 * 清单（供 stats 复用），任何一项不满足返回 null。
 * @param {{ key?: string, cssHash?: string, preloadHash?: string, files?: { name: string, size: number }[] } | null} manifest
 * @param {{ key: string, cssHash: string, preloadHash: string, fileNames: string[] }} expected
 */
async function matchManifest(manifest, expected) {
  if (
    !manifest ||
    manifest.key !== expected.key ||
    manifest.cssHash !== expected.cssHash ||
    manifest.preloadHash !== expected.preloadHash ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== expected.fileNames.length ||
    manifest.files.some(
      (entry, index) => entry?.name !== expected.fileNames[index],
    )
  ) {
    return null;
  }

  let fontsCss;
  try {
    fontsCss = await readFile(resolve(cssDirectory, "fonts.css"), "utf8");
  } catch {
    return null;
  }
  if (sha256(fontsCss) !== expected.cssHash) {
    return null;
  }

  let preloadData;
  try {
    preloadData = await readFile(preloadDataPath, "utf8");
  } catch {
    return null;
  }
  if (sha256(preloadData) !== expected.preloadHash) {
    return null;
  }

  for (const entry of manifest.files) {
    try {
      const actual = await stat(resolve(fontDirectory, entry.name));
      if (actual.size !== entry.size) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return manifest.files;
}

async function main() {
  const vendorCss = await readFile(resolve(notoSource, "index.css"), "utf8");
  const faces = collectNotoFaces(vendorCss);
  const preloadFiles = computePreloadFiles(faces);
  const expectedCss = `${rewriteNotoCss(faces.map((f) => f.block))}\n\n${buildSourceCodeCss()}\n`;
  const key = `${await readPackageVersions()}|${sha256(vendorCss)}`;

  /** @type {{ key: string, cssHash: string, preloadHash: string, fileNames: string[] }} */
  const expected = {
    key,
    cssHash: sha256(expectedCss),
    preloadHash: sha256(
      `${JSON.stringify({ files: preloadFiles }, null, 2)}\n`,
    ),
    fileNames: [...faces.map((f) => f.file), ...SOURCE_CODE_FILES],
  };

  // 增量跳过：manifest 缺失/被删产物/内容不一致时走完整重拷。
  const manifest = wantForce ? null : await loadManifest();
  const matchedFiles = await matchManifest(manifest, expected);
  if (matchedFiles) {
    const mb = (
      matchedFiles.reduce((sum, f) => sum + (f.size || 0), 0) /
      1024 /
      1024
    ).toFixed(2);
    console.log(
      `sync-fonts: up to date (${matchedFiles.length} files, ${mb} MB); skipped (--force to redo)`,
    );

    if (wantStats) {
      console.log("sync-fonts stats:");
      console.log(`  files in static/fonts: ${matchedFiles.length}`);
      console.log("  Noto by size (desc, top 8 CJK):");
      const cjkSorted = matchedFiles
        .filter((f) => f.name.includes("noto-") && !f.name.includes("-latin-"))
        .slice()
        .sort((a, b) => b.size - a.size);
      for (const row of cjkSorted.slice(0, 8)) {
        console.log(`    ${(row.size / 1024).toFixed(0)}KB ${row.name}`);
      }
    }
    return;
  }

  // 先写仓库根暂存目录再整体替换：失败清理暂存且不破坏既有 static/fonts；
  // 暂存目录不在 static/ 下，Hugo 不会把它当静态文件发布。
  const stagingDirectory = resolve(root, ".fonts-staging");
  let stageResult;
  try {
    stageResult = await stageFonts(stagingDirectory, faces);
    await rm(fontDirectory, { force: true, recursive: true });
    await rename(stagingDirectory, fontDirectory);
  } catch (error) {
    await rm(stagingDirectory, { force: true, recursive: true }).catch(() => {});
    throw error;
  }
  await mkdir(cssDirectory, { recursive: true });
  await mkdir(resolve(root, "data"), { recursive: true });

  const { faces: stagedFaces, fileSizes, copiedBytes } = stageResult;

  await writeFile(resolve(cssDirectory, "fonts.css"), expectedCss);

  // 关键路径：latin + 固定 CJK 白名单；其余 CJK 仍靠 unicode-range 按需加载。
  const preloadBytes = preloadFiles.reduce(
    (sum, f) => sum + (fileSizes.get(f) || 0),
    0,
  );

  // 生成物 — 勿手改 data/font_preload.json。
  await writeFile(
    preloadDataPath,
    `${JSON.stringify({ files: preloadFiles }, null, 2)}\n`,
  );

  // manifest 最后写入：前置步骤失败时不会留下“看似新鲜”的清单。
  const files = [...stagedFaces.map((f) => f.file), ...SOURCE_CODE_FILES].map(
    (name) => ({ name, size: fileSizes.get(name) ?? 0 }),
  );
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        key,
        cssHash: expected.cssHash,
        preloadHash: expected.preloadHash,
        files,
      },
      null,
      2,
    )}\n`,
  );

  const mb = (copiedBytes / 1024 / 1024).toFixed(2);
  const preloadMb = (preloadBytes / 1024 / 1024).toFixed(2);
  const latinCount = stagedFaces.filter((f) => f.isLatin).length;
  const cjkCount = stagedFaces.length - latinCount;
  console.log(
    `sync-fonts: ${stagedFaces.length} Noto faces (latin=${latinCount}, cjk=${cjkCount}) + ${SOURCE_CODE_FILES.length} Source Code Pro (${mb} MB)`,
  );
  console.log(
    `sync-fonts: preload ${preloadFiles.length} file(s) (${preloadMb} MB): ${preloadFiles.join(", ")}`,
  );

  if (wantStats) {
    const onDisk = await readdir(fontDirectory);
    console.log("sync-fonts stats:");
    console.log(`  files in static/fonts: ${onDisk.length}`);
    console.log("  Noto by size (desc, top 8 CJK):");
    const cjkSorted = stagedFaces
      .filter((f) => !f.isLatin)
      .slice()
      .sort(
        (a, b) => (fileSizes.get(b.file) || 0) - (fileSizes.get(a.file) || 0),
      );
    for (const row of cjkSorted.slice(0, 8)) {
      const sizeKb = ((fileSizes.get(row.file) || 0) / 1024).toFixed(0);
      console.log(`    ${sizeKb}KB ${row.file}`);
    }
  }
}

main().catch((error) => {
  console.error("sync-fonts:", error);
  process.exit(1);
});
