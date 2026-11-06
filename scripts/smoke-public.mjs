/**
 * 构建后对 ./public（或 SMOKE_PUBLIC_DIR / argv[2]）做冒烟断言。
 * 应在 build:site 之后运行；涉及 Pagefind 的断言需先 build:search。
 *
 * 各检查项按主题拆到 scripts/checks/*.mjs，本文件只负责调度与结果汇总。
 * 新增断言请放进对应的 check 模块；失败信息会带上模块名。
 *
 * 站点主机取自 config/_default/hugo.yaml 的 baseURL，不在此另写一份：
 * robots / sitemap / 分页 canonical 都要对账同一个主机，改域名时只该改一处。
 *
 * 用法：node scripts/smoke-public.mjs [publicDir]
 */
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { createContext } from "./checks/context.mjs";
import * as a11y from "./checks/a11y.mjs";
import * as assets from "./checks/assets.mjs";
import * as home from "./checks/home.mjs";
import * as links from "./checks/links.mjs";
import * as notFound from "./checks/not-found.mjs";
import * as pagefind from "./checks/pagefind.mjs";
import * as post from "./checks/post.mjs";
import * as products from "./checks/products.mjs";
import * as robots from "./checks/robots.mjs";
import * as rss from "./checks/rss.mjs";
import * as sitemap from "./checks/sitemap.mjs";
import * as tags from "./checks/tags.mjs";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(
  root,
  process.env.SMOKE_PUBLIC_DIR || process.argv[2] || "public",
);

/**
 * baseURL 去掉尾斜杠后的站点基址（当前无子路径，等价于 origin）。
 * 用基址而非 origin：将来若把站点挪到子路径，robots / sitemap 的拼接才不会少一段。
 * @returns {Promise<string>}
 */
async function readSiteHost() {
  const configPath = join(root, "config", "_default", "hugo.yaml");
  const config = await readFile(configPath, "utf8");
  const match = config.match(/^\s*baseURL:\s*["']?([^"'\s#]+)/m);
  if (!match) {
    throw new Error(`baseURL not found in ${configPath}`);
  }
  return match[1].replace(/\/+$/, "");
}

/** 按运行顺序排列；critical 的模块失败后立即中止（后续检查无从读取产物）。 */
const CHECKS = [
  products,
  robots,
  sitemap,
  home,
  notFound,
  assets,
  a11y,
  tags,
  rss,
  links,
  pagefind,
  post,
];

async function main() {
  console.log(`smoke-public: checking ${publicDir}`);

  const ctx = createContext({ publicDir, siteHost: await readSiteHost() });

  try {
    await stat(publicDir);
  } catch {
    console.error(`smoke-public: FAILED`);
    console.error(`  ✗ ${publicDir} does not exist (run build first)`);
    process.exit(1);
  }

  for (const check of CHECKS) {
    const before = ctx.failures.length;
    try {
      await check.run(ctx);
    } catch (err) {
      // 单个 check 抛错（例如正则写崩、产物结构异常）不该吞掉其它模块的结论：
      // 记成该模块的一条失败，继续往下跑，最后统一汇总退出。
      ctx.assert(false, `${check.name}: threw ${err && err.message ? err.message : err}`);
      if (check.critical) {
        console.error(`  ✗ ${check.name}: threw, aborting`);
        break;
      }
    }
    const failed = ctx.failures.length - before;
    if (failed > 0) {
      console.error(`  ✗ ${check.name}: ${failed} failure(s)`);
      if (check.critical) {
        break;
      }
    } else {
      console.log(`  ✓ ${check.name}`);
    }
  }

  if (ctx.failures.length) {
    console.error("smoke-public: FAILED");
    for (const f of ctx.failures) {
      console.error(`  ✗ ${f}`);
    }
    process.exit(1);
  }

  console.log("smoke-public: ok");
}

main().catch((err) => {
  console.error("smoke-public: error", err);
  process.exit(1);
});
