/**
 * 内部链接完整性：产物里所有以 / 开头的 href、src 与 srcset 候选都必须能在 public/ 里找到对应文件。
 *
 * 只做「文件是否存在」这一层：目录式链接（/about/）按 index.html 解析；
 * 带锚点与查询串的先剥掉再判断。外链、mailto、data: 一律跳过。
 * 内联脚本里的字符串不参与，只扫标签属性。
 */
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export const name = "links";

/**
 * 从 HTML 里取出所有 href/src 值，以及 srcset 里的每个候选地址。
 *
 * srcset 语法是「URL 描述符, URL 描述符」，描述符（640w / 2x）可省略，
 * 这里只取每段的第一个空白分隔字段，即 URL 本身。
 * @param {string} html
 */
function collectRefs(html) {
  const refs = [];
  const pattern = /\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(pattern)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) {
      refs.push(value);
    }
  }

  const srcsetPattern = /\ssrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of html.matchAll(srcsetPattern)) {
    const value = match[1] ?? match[2] ?? "";
    for (const candidate of value.split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) {
        refs.push(url);
      }
    }
  }
  return refs;
}

/**
 * 把站内路径解析成 public 下的相对路径；外部或页内引用返回 null。
 *
 * 畸形百分号编码（内容里出现裸 `%`）会让 decodeURIComponent 抛错，
 * 此时按未解码的原样返回，让后续「文件是否存在」去判定并正常报错，
 * 而不是让整个 smoke 崩在异常里、丢掉前面已收集的失败信息。
 * @param {string} ref
 */
function toPublicPath(ref) {
  if (!ref.startsWith("/") || ref.startsWith("//")) {
    return null;
  }
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) {
    return null;
  }
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    decoded = clean;
  }
  return decoded.replace(/^\/+/, "").replace(/\/+$/, "");
}

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const htmlFiles = (await ctx.listFiles(ctx.publicDir)).filter((file) =>
    file.endsWith(".html"),
  );

  /** @type {Map<string, string[]>} 未解析的路径 -> 出现过的页面 */
  const missing = new Map();

  for (const file of htmlFiles) {
    const rel = relative(ctx.publicDir, file).replaceAll("\\", "/");
    const html = await readFile(file, "utf8");
    for (const ref of collectRefs(html)) {
      const target = toPublicPath(ref);
      if (target === null) {
        continue;
      }
      if (await ctx.exists(target)) {
        continue;
      }
      if (await ctx.exists(join(target, "index.html"))) {
        continue;
      }
      if (!missing.has(ref)) {
        missing.set(ref, []);
      }
      missing.get(ref).push(rel);
    }
  }

  for (const [ref, pages] of missing) {
    const sample = pages.slice(0, 3).join(", ");
    const more = pages.length > 3 ? ` 等 ${pages.length} 处` : "";
    ctx.assert(false, `internal link ${ref} has no file in public (used by ${sample}${more})`);
  }
}
