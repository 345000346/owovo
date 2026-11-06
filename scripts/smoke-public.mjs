/**
 * 构建后对 ./public（或 SMOKE_PUBLIC_DIR / argv[2]）做冒烟断言。
 * 应在 build:site 之后运行；涉及 Pagefind 的断言需先 build:search。
 *
 * 各检查项按主题拆到 scripts/checks/*.mjs，本文件只负责调度与结果汇总。
 * 新增断言请放进对应的 check 模块；失败信息会带上模块名。
 *
 * 用法：node scripts/smoke-public.mjs [publicDir]
 */
import { stat } from "node:fs/promises";
import { resolve } from "node:path";

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
const siteHost = "https://owovo.xyz";

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

  const ctx = createContext({ publicDir, siteHost });

  try {
    await stat(publicDir);
  } catch {
    console.error(`smoke-public: FAILED`);
    console.error(`  ✗ ${publicDir} does not exist (run build first)`);
    process.exit(1);
  }

  for (const check of CHECKS) {
    const before = ctx.failures.length;
    await check.run(ctx);
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
