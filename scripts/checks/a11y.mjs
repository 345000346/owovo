/**
 * 无障碍基本契约：每个非重定向 HTML 页都必须满足 AGENTS.md「无障碍」一节的硬性要求。
 * 这些规则原本只写在文档里，靠人肉自查；此模块把它们变成构建后断言。
 *
 * 断言前先剥掉 HTML 注释，避免注释里举例的标签被误计数。
 */
import { readFile } from "node:fs/promises";
import { relative } from "node:path";

export const name = "a11y";

/**
 * 去掉 HTML 注释，注释中出现的标签不计入统计。
 * @param {string} html
 */
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * 是否是 Hugo 的刷新跳转桩页（page/1 之类），这类页面没有壳，不参与断言。
 * @param {string} html
 */
function isRedirect(html) {
  return /<meta\b[^>]*http-equiv=(?:"refresh"|'refresh'|refresh)/i.test(html);
}

/**
 * 取标签上某个属性的值（兼容带引号与不带引号）。
 * @param {string} tag
 * @param {string} attr
 */
function attrValue(tag, attr) {
  const match = tag.match(
    new RegExp(`\\s${attr}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

/**
 * 去掉标签后剩下的可见文本。
 * @param {string} html
 */
function textOf(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z#0-9]+;/gi, "")
    .trim();
}

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const htmlFiles = (await ctx.listFiles(ctx.publicDir)).filter((file) =>
    file.endsWith(".html"),
  );

  for (const file of htmlFiles) {
    const rel = relative(ctx.publicDir, file).replaceAll("\\", "/");
    const raw = await readFile(file, "utf8");
    if (isRedirect(raw)) {
      continue;
    }
    const html = stripComments(raw);

    ctx.assert(
      /<html\b[^>]*\slang=(?:"[^"]+"|'[^']+'|[^\s>]+)/i.test(html),
      `${rel} must declare <html lang>`,
    );

    const h1s = html.match(/<h1(?:\s|>)/gi) || [];
    ctx.assert(
      h1s.length === 1,
      `${rel} must contain exactly one h1 (found ${h1s.length})`,
    );

    ctx.assert(
      /<main(?:\s|>)/i.test(html),
      `${rel} must contain a <main> landmark`,
    );

    // 跳转链接必须存在，且目标 id 真的在本文档里——否则键盘用户跳到空白。
    const skipLink = (html.match(/<a\b[^>]*class="?skip-link"?[^>]*>/i) || [])[0];
    ctx.assert(skipLink !== undefined, `${rel} must keep the skip link`);
    if (skipLink) {
      const href = attrValue(skipLink, "href");
      ctx.assert(
        href !== null && href.startsWith("#") && href.length > 1,
        `${rel} skip link must point at an in-page id (got ${href})`,
      );
      if (href !== null && href.startsWith("#") && href.length > 1) {
        const id = href.slice(1);
        // id 直接拼进 RegExp 会把 `a[b` 之类畸形值变成非法正则并炸掉整个模块，
        // 所以用与下方 id 清单一致的匹配集合做字符串判断。
        const existingIds = [
          ...html.matchAll(/\sid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g),
        ].map((match) => match[1] ?? match[2] ?? match[3]);
        ctx.assert(
          existingIds.includes(id),
          `${rel} skip link targets #${id} but no such id exists`,
        );
      }
    }

    // id 必须全页唯一：重复时 aria-labelledby / aria-controls / 锚点会指向错误节点。
    const ids = [
      ...html.matchAll(/\sid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g),
    ].map((match) => match[1] ?? match[2] ?? match[3]);
    const seen = new Set();
    const duplicated = new Set();
    for (const id of ids) {
      if (seen.has(id)) {
        duplicated.add(id);
      }
      seen.add(id);
    }
    ctx.assert(
      duplicated.size === 0,
      `${rel} has duplicate id(s): ${[...duplicated].join(", ")}`,
    );

    for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
      ctx.assert(
        attrValue(tag, "alt") !== null,
        `${rel} has an <img> without alt: ${tag.slice(0, 90)}`,
      );
    }

    for (const tag of html.match(/<nav\b[^>]*>/gi) || []) {
      ctx.assert(
        attrValue(tag, "aria-label") !== null,
        `${rel} has a <nav> without aria-label`,
      );
    }

    // 按钮的可访问名：要么 aria-label，要么自身可见文本。
    //
    // 边界取「最近一个 </button>」与「下一个 <button 开标签」之中更近的那个：
    // 前者保证不漏判闭合，后者保证把一个按钮的文本永远算不到另一个头上
    // （成对匹配正则的老毛病：少写闭合标签时会把后面按钮的文本吞进来）。
    const buttonTags = [...html.matchAll(/<button\b[^>]*>/gi)];
    for (const [index, match] of buttonTags.entries()) {
      const openTag = match[0];
      const start = match.index + openTag.length;
      const closeIndex = html.indexOf("</button>", start);
      const nextOpen = buttonTags[index + 1]?.index ?? html.length;
      const endCandidates = [closeIndex === -1 ? html.length : closeIndex, nextOpen];
      const end = Math.min(...endCandidates);
      const hasLabel = attrValue(openTag, "aria-label") !== null;
      ctx.assert(
        hasLabel || textOf(html.slice(start, end)).length > 0,
        `${rel} has a <button> with neither aria-label nor text: ${openTag.slice(0, 90)}`,
      );
    }
  }
}
