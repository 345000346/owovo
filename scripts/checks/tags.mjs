/** 标签 term 页：中文标题、中文 h1、标签专属描述（不得回落到站点通用描述）。 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export const name = "tags";

/** @param {import("./context.mjs").SmokeContext} ctx */
export async function run(ctx) {
  const tagEntries = await readdir(ctx.publicPath("tags"), {
    withFileTypes: true,
  });
  const tagDirs = tagEntries.filter((entry) => entry.isDirectory());
  // 没有 tags 页本身就是异常：taxonomy 仅 tags，构建正常必然产出 tags/ 目录内容。
  ctx.assert(tagDirs.length > 0, "public/tags/ has no term pages");
  const sampleTag = tagDirs[0];

  const rel = join("tags", sampleTag.name, "index.html");
  const html = await ctx.readPublic(rel);
  ctx.assert(/<title>标签：/.test(html), `${rel} title must start with 标签：`);
  ctx.assert(
    /<h1(?:\s[^>]*)?>标签：/.test(html),
    `${rel} must contain a Chinese tag h1`,
  );
  ctx.assert(
    html.includes("标签下的文章，共") &&
      !html.includes('name=description content="分享一些日常'),
    `${rel} must use a term-specific description`,
  );
}
