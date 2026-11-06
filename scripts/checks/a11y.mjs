/**
 * 无障碍基本契约：每个非重定向 HTML 页都必须满足 AGENTS.md「无障碍」一节的硬性要求。
 * 这些规则原本只写在文档里，靠人肉自查；此模块把它们变成构建后断言。
 *
 * 断言前先剥掉 HTML 注释，避免注释里举例的标签被误计数。
 */
import { readFile } from "node:fs/promises";
import { relative } from "node:path";

export const name = "a11y";

/** 去掉 HTML 注释，注释中出现的标签不计入统计。 */
/** @param {string} html */
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/** 是否是 Hugo 的刷新跳转桩页（page/1 之类），这类页面没有壳，不参与断言。 */
/** @param {string} html */
function isRedirect(html) {
  return /<meta\b[^>]*http-equiv=(?:"refresh"|'refresh'|refresh)/i.test(html);
}

/** 取标签上某个属性的值（兼容带引号与不带引号）。 */
/** @param {string} tag @param {string} attr */
function attrValue(tag, attr) {
  const match = tag.match(
    new RegExp(`\\s${attr}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

/** 去掉标签后剩下的可见文本。 */
/** @param {string} html */
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
        ctx.assert(
          new RegExp(`\\sid=(?:"${id}"|'${id}'|${id})(?:\\s|>)`).test(html),
          `${rel} skip link targets #${id} but no such id exists`,
        );
      }
    }

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
    for (const element of html.match(/<button\b[\s\S]*?<\/button>/gi) || []) {
      const openTag = (element.match(/<button\b[^>]*>/i) || [""])[0];
      const hasLabel = attrValue(openTag, "aria-label") !== null;
      const inner = textOf(element.slice(openTag.length));
      ctx.assert(
        hasLabel || inner.length > 0,
        `${rel} has a <button> with neither aria-label nor text: ${openTag.slice(0, 90)}`,
      );
    }
  }
}
