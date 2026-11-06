/**
 * front matter 解析与重排的纯函数，供 normalize-frontmatter 与 check-conventions 共用。
 * 只处理 YAML front matter 的顶层键切块，不解析值语义（值一律原样保留）。
 */

/** 文章字段序：与 archetypes/default.md、AGENTS.md 一致。 */
export const POST_ORDER = [
  "title",
  "date",
  "slug",
  "description",
  "tags",
  "draft",
  "toc",
  "source",
  "author",
  "outdated",
  "outdatedNote",
];

/** 普通页字段序。 */
export const PAGE_ORDER = [
  "title",
  "date",
  "description",
  "type",
  "layout",
  "toc",
  "slug",
  "tags",
  "draft",
  "sitemap",
];

/**
 * 切出 front matter 与正文。同时接受 LF / CRLF，正文逐字保留。
 * 闭合 `---` 后可以没有换行（文件以 `---` EOF 结尾）：Hugo 接受这种形态，
 * 解析不必强求尾换行；normalize 重排输出时本来就会补上。
 * @param {string} text
 * @returns {{ fm: string, body: string } | null}
 */
export function splitFrontMatter(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return null;
  }
  const start = text.startsWith("---\r\n") ? 5 : 4;
  // `\r?\n---(\r?\n|$)`：闭合符独占一行，后随换行或直接 EOF。
  const endMatch = text.slice(start).match(/\r?\n---(?:\r?\n|$)/);
  if (!endMatch || endMatch.index === undefined) {
    return null;
  }
  const fm = text.slice(start, start + endMatch.index);
  const body = text.slice(start + endMatch.index + endMatch[0].length);
  return { fm, body };
}

/**
 * 按顶层键切块（含多行缩进值与块标量内部的空行）。
 * key 为 null 的块是空行或整行注释，由 rebuild 决定归属。
 * @param {string} fmBody
 * @returns {{ key: string | null, raw: string }[]}
 */
export function parseBlocks(fmBody) {
  const lines = fmBody.split(/\r?\n/);
  /** @type {{ key: string | null, raw: string }[]} */
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      blocks.push({ key: null, raw: line });
      i += 1;
      continue;
    }
    const km = line.match(/^([A-Za-z0-9_]+)\s*:/);
    if (!km) {
      // 未识别形态不能静默当注释丢掉：normalize 的职责是重排而非筛选内容，
      // 丢弃会让维护脚本悄悄改写用户数据（引号值、锚点行等都会走到这里）。
      throw new Error(`frontmatter: unrecognized line: ${JSON.stringify(line)}`);
    }
    const key = km[1];
    /** @type {string[]} */
    const chunk = [line];
    i += 1;
    while (i < lines.length) {
      if (lines[i].startsWith(" ") || lines[i].startsWith("\t")) {
        chunk.push(lines[i]);
        i += 1;
        continue;
      }
      // 块标量（| / >）内部的空行：后随缩进行则归属当前键，逐字保留。
      if (
        lines[i].trim() === "" &&
        i + 1 < lines.length &&
        (lines[i + 1].startsWith(" ") || lines[i + 1].startsWith("\t"))
      ) {
        chunk.push(lines[i]);
        i += 1;
        continue;
      }
      break;
    }
    blocks.push({ key, raw: chunk.join("\n") });
  }
  return blocks;
}

/**
 * 按 order 重排；丢弃 categories / lastmod；文章侧丢弃 toc: true。
 * 字段间注释挂到其后第一个键随排序搬运，尾随注释原样保留。
 * @param {{ key: string | null, raw: string }[]} blocks
 * @param {string[]} order
 * @param {boolean} isPost
 * @returns {string} 结尾恰好一个换行
 */
export function rebuild(blocks, order, isPost) {
  /** @type {Map<string, string>} */
  const byKey = new Map();
  /** @type {string[]} */
  const leadingComments = [];
  /** 字段间注释：挂到其后第一个键，随键排序搬运。 */
  let pendingComments = [];

  for (const block of blocks) {
    if (block.key === null) {
      if (block.raw.trimStart().startsWith("#")) {
        if (byKey.size === 0 && pendingComments.length === 0) {
          leadingComments.push(block.raw);
        } else {
          pendingComments.push(block.raw);
        }
      }
      continue;
    }
    const attached = pendingComments;
    pendingComments = [];
    if (block.key === "categories") {
      continue; // 被移除键上的注释随键一并丢弃。
    }
    if (block.key === "lastmod") {
      continue;
    }
    if (isPost && block.key === "toc") {
      const value = block.raw.split(":").slice(1).join(":").trim().toLowerCase();
      if (value === "true" || value === "yes" || value === "1") {
        continue;
      }
    }
    byKey.set(
      block.key,
      attached.length > 0 ? `${attached.join("\n")}\n${block.raw}` : block.raw,
    );
  }

  /** @type {string[]} */
  const out = [...leadingComments];
  for (const key of order) {
    if (byKey.has(key)) {
      out.push(byKey.get(key));
      byKey.delete(key);
    }
  }
  for (const raw of byKey.values()) {
    out.push(raw);
  }
  // 未挂到任何键的尾随注释原样保留。
  out.push(...pendingComments);
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}
