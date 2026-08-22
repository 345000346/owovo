# AGENTS.md

本文件是仓库的**唯一协作说明**（无 `README.md`），供人与 AI / 自动化助手共用：构建、架构、内容模型、代码写法与验证。

## 构建与开发命令

```bash
npm ci                    # 首次 / CI：按 lock 安装，勿用 npm install 漂移依赖
npm run dev               # 本地 Hugo 开发服务器（含草稿，先同步字体；不生成/更新 Pagefind）
npm run build:site        # 仅 Hugo（--environment production --gc --minify --cleanDestinationDir）
npm run build:search      # 仅 Pagefind 索引（--site public）
npm run smoke             # 对 public/ 做构建后断言
npm run build             # 生产全流程：site + search + smoke
npm run sync:fonts        # Fontsource → static/fonts + assets/css/fonts.css + data/font_preload.json
npm run sync:fonts:stats  # 同上并打印分片体积统计
npm run preview           # 构建后启动 Pagefind 预览
npm run hugo:env          # 打印本机 Hugo 环境
```

维护（不进默认 CI）：

```bash
node scripts/normalize-frontmatter.mjs   # 重排 content front matter；移除 lastmod/categories，文章侧丢掉 toc: true；字段间注释挂到其后键随排序搬运
```

注意：

- `build:site` **必须**带 `--environment production`，以便 `layouts/robots.txt` 输出 `Allow: /` 与正确 `baseURL` Sitemap。
- 若本机正在跑 `hugo server`，勿与 `build` 共用被污染的 `public/`（server 会写入 livereload）；构建前先停 server。
- **不使用 Prettier** 或其它自动格式化；缩进/换行遵守 `.editorconfig`，其余按「代码写法约定」手写。
- **无** `cf:setup` / Cloudflare 一键脚本；Cloudflare 控制台配置不在仓库维护。
- Node：`.node-version`（`>=24.18.0`，`package.json` `engines` 一致）
- Hugo：**extended**，版本见 `.hugo-version`（当前 `0.164.0`）
- 字体在每次 `dev` / `build:site` 前由 `scripts/sync-fonts.mjs` 同步

## 项目结构

```
config/_default/          # Hugo 配置
  hugo.yaml               # 站点、菜单、输出格式、安全策略等
  markup.yaml             # Goldmark、Chroma、TOC
  params.yaml             # 运营参数（作者、描述、主题色等）
layouts/                  # 站点模板（已压平，无 themes/）
  _default/               # baseof、list、single、terms + render hooks
  post/                   # 文章 single
  archives/               # 文章归档普通页（type: archives）
  partials/               # 组件与工具 partials
  shortcodes/             # 自定义 shortcodes
assets/
  js/                     # 见下文「JS 拆分与 Concat」
  scss/                   # Dart Sass：main.scss 入口；token 在 utils/_variables.scss
  css/fonts.css           # sync-fonts 生成（gitignore）
data/                     # Socials.toml、SVG.toml；font_preload.json 由 sync-fonts 生成
content/                  # 内容（文章、关于、想法、普通归档页等）
static/                   # 原样发布；fonts/ 由构建生成
scripts/
  sync-fonts.mjs          # 字体全量分片 + latin/CJK 白名单 preload
  smoke-public.mjs        # 构建后 public/ 断言
  normalize-frontmatter.mjs  # 维护：FM 字段序、lastmod/categories 清理与 toc 默认
archetypes/default.md     # 新文章 front matter 模板
.github/workflows/        # GitHub Pages：build →（非 PR）deploy
LICENSE.md                # 主站代码 MIT；内容与第三方资产例外
```

## 架构要点

- **单站点**：`layouts` / `assets` 在仓库根；不再使用 `theme: owovo` 边界。
- **单语（简体中文）**：无 i18n；UI 文案写在模板里。`defaultContentLanguage: zh-cn` 与 `locale` 用于 `lang` / SEO / Pagefind。
- **配置最小化**：视觉进 SCSS；功能默认写死在模板；`params` 只留作者、描述、主题色等。`themeColor` / `themeColorDark` **必填**。
- **Dart Sass**：`css.Sass`（`dartsass` + `sass-embedded`）；只允许 `@use` / `@forward`。
- **JS 拆分与 Concat**（`layouts/partials/script.html`）：
  - **全站一包**：`theme.js` + `navigation.js` + `scroll-ui.js` → `resources.Concat` 为 `js/site.js` → Minify + Fingerprint（一个请求、源码分文件）。
  - **Concat 作用域**：三文件拼成**同一个** `type="module"`，顶层 `const` / `function` **共用作用域**。标识符必须在三文件间**全局唯一**（禁止两个文件都导出顶层 `init` / 同名 helper）。实现尽量收进各自 `init…()` 内部。
  - **独立模块**（各一请求）：`search-dialog.js`（全站）；`article.js`（文章页，以及 `toc: true` 的普通页）；`search-highlight.js`（仅 `?hl=`，由 loader 注入）。
  - FOUC 内联脚本在 `layouts/partials/head.html`，与 `theme.js` 契约必须同步（见 `theme.js` 文件头）；同时给 `<html>` 标记 `.js`，移动导航只在该标记存在时折叠。
  - SEO：`partials/utils/seo.html`（author meta + OG + Twitter + JSON-LD）。
  - taxonomy **仅** `tags`。
- **字体**：`@fontsource-variable/noto-serif-sc` + `@fontsource/source-code-pro` 自托管；`sync-fonts` 拷贝官方 index **全部分片**（不做站点用字扫描）。`data/font_preload.json` = latin + 固定 CJK 白名单（缺文件则跳过）；其余 CJK 靠 `unicode-range`。调试：`npm run sync:fonts:stats`。
- **搜索**：构建后 `pagefind --site public`；UI 为全站 Dialog + Default UI，但索引范围仅为文章；文章正文使用 `data-pagefind-body`，其它 Hugo 页面在 `<body>` 使用 `data-pagefind-ignore`；**无**独立 `/search/` 页。
- **RSS**：首页输出 `/rss.xml`；只收录 `Section == post` 的最近 20 篇摘要，`pubDate` 使用文章 `date`，不使用构建时钟或全文。
- **section 输出**：`disableKinds: ["section"]` 全局关闭 section 列表页；当前内容模型只需要文章实体与普通归档页。将来新增 section 时，必须显式评估是否需要重新启用对应输出。
- **CI/CD**：`main` 推送：`npm ci` → `build:site --panicOnWarning` → `build:search` → `smoke` → deploy Pages；PR 只构建不部署。**无** format 步骤。
- **域名 / CDN**：`baseURL` + `static/CNAME` → `https://owovo.xyz`；Cloudflare 代理仅在外部控制台维护。**勿**把 `baseURL` 改成 `*.github.io`；站点不为 `/post/` 根配置兼容重定向，也不做 Cloudflare 301。

## 代码写法约定

### 通用

- UTF-8、LF、文件末换行（`.editorconfig`）。
- JS / SCSS / YAML / `scripts`：2 空格；`layouts/**`：4 空格。
- 提交信息用中文，按变更类型拆分。
- 不引入 Prettier / 自动整库 format；不引入前端打包器或 TypeScript（除非另有明确决策）。

### JavaScript（`assets/js`）

- 文件头：职责；跨文件契约用 bullet 列出。
- 结构：常量/选择器 → 纯函数 → `init…()` → 文件末调用。
- `const` / `let`，不用 `var`（FOUC 内联除外）。
- 双引号优先；语句带分号；**不要**脚本级 `{ … }` / IIFE 包一层（独立 module 文件本身已隔离；**Concat 的三文件见上节作用域规则**）。
- `type="module"` 已 strict，**不要** `"use strict"`。
- DOM 缺失 → 静默 `return`；仅失败路径 `console.error`。
- 与模板的 `id` / `class` / `data-*` 为契约，改名两侧同改。
- 自有 class 用连字符（如 `code-block-status`）；第三方 `pagefind-ui__*` 可保留。

### JavaScript（`scripts/*.mjs`）

- `node:` 前缀 import；文件头写清用途与用法。
- 常量 → 工具 → `main` → 启动；公共 API 补 JSDoc。
- 失败：stderr + 非零退出码。

### SCSS

- 仅 `@use` / `@forward`。
- partial 以 `_` 开头；入口只有 `main.scss`（按 base → themes → layout → components → pages → responsive 分组）。
- token：`utils/_variables.scss` + themes 的 CSS 变量。
- class **连字符**；自有代码禁止 `__` BEM。
- 嵌套建议 ≤ 3；新组件 = partial + `components/_*.scss`（+ 必要时 JS）并在 `main.scss` `@use`。

### Hugo 模板

- 缩进 4 空格；输出敏感处 `{{-` / `-}}`。
- 多参 partial 用 `dict`；文章判断只用 `utils/is-post.html`。
- UI 简体中文硬编码。
- JS/CSS：`Minify | Fingerprint`，`integrity` + `crossorigin="anonymous"`。
- 外链 render hook：`target="_blank" rel="external noopener"`（实现里可含 `noreferrer`，与 smoke 一致即可）。

### Front matter（文章）

字段序：

```yaml
title: "..."
date: YYYY-MM-DDTHH:mm:ss+08:00
slug: "kebab-case"    # 与目录名一致
description: "..."
tags: ["..."]
draft: true           # 仅脚手架新建时；发布前删除
# toc: false          # 默认开启 TOC：勿写 toc: true；仅关闭时写 false
# source / author     # 仅转载
# outdated / outdatedNote
```

- 必填：`title` `date` `slug` `description` `tags`
- 禁止 `categories`
- 普通页 TOC 为 **opt-in**（如 about：`toc: true`）
- 脚手架：`archetypes/default.md`；批量整理：`node scripts/normalize-frontmatter.mjs`

## 内容模型（列表职责）

| 角色         | 路径           | 说明                                                            |
| ------------ | -------------- | --------------------------------------------------------------- |
| 文章实体     | `/post/:slug/` | `content/post/<slug>/index.md`；`layouts/post/single.html`      |
| 权威文章列表 | `/archives/`   | `content/archives.md` + `type: archives`；按年分组             |
| 首页         | `/`            | 同一批文章，摘要 + 分页                                         |
| 文章内容目录 | `content/post/` | 仅作为内容组织目录；不生成 `/post/` section 根页面            |
| 关于         | `/about/`      | `layout: about`                                                 |
| 普通页       | 如 `/ideas/`   | `type: page` → `layouts/_default/single.html`                   |
| 搜索         | （无独立 URL） | 全站 Dialog，结果仅文章                                       |
| 标签         | `/tags/`       | 唯一 taxonomy                                                   |

## 模板约定

- partial 字典传参：`{{ partial "utils/icon.html" (dict "$" . "name" "tag") }}`
- 路径小写、连字符
- 文章判断：`utils/is-post.html`；关于：按 `layout: about` 识别（无独立判断 partial）
- 文章壳只在 `layouts/post/single.html`；归档壳在 `layouts/archives/single.html`；通用页不要复制文章壳
- 404：只 `define "main"`，共用 `baseof`（有搜索 Dialog；无 `?hl=` loader）
- 高亮 loader：`partials/components/search-highlight-loader.html`；仅文章页在 head 调用
- 菜单搜索：`identifier: search`、`url: "#search"`、`data-search-trigger`；支持 `/#search` 与 hashchange
- 不要新增 `/search/` 页或 `categories` taxonomy

## 文章操作

- 路径：`content/post/<slug>/index.md`
- slug：全小写 kebab-case（与目录名一致）
- 日期只使用 front matter 的 `date`；不使用 `lastmod`、`.Lastmod` 或自动生成的修改日期
- 只用 `tags`
- TOC 默认开；关闭写 `toc: false`
- 转载：`source`（可选 `author`）；过时：`outdated` + 建议 `outdatedNote`
- 关于页：`layout: about`（通常 `type: page`）
- 图片放文章目录内引用（Hugo 可出响应式 WebP）
- permalink：`/post/:slug/`

## 验证

提交前：

```bash
npm run build
```

`npm run dev` 仅启动 Hugo server，不会生成或更新 Pagefind 索引；需要验证搜索时使用 `npm run build` 或 `npm run preview`。

`smoke` 会按 HTML 路径检查文章与非文章的 Pagefind 标记、`/post/` 根不存在以及修改日期元数据不回流；校验跨文件契约数字（导航断点 `--max-width`、TOC 折叠断点 68em、导航关闭兜底 600ms ≥ 过渡时长）并全站扫描产物无 `ZgotmplZ`（链接协议被过滤的标志；正文确需讨论该字样时请改写措辞避开全文匹配）；不要将文章数量或 Pagefind 页数写死。

模板改动建议：

```bash
npm run build:site -- --panicOnWarning --logLevel warn
```

`npm run dev` 手测：首页、文章、归档、标签、搜索 Dialog、关于、主题切换、移动导航、代码复制；带 `?hl=` 时高亮。

## 已知技术选择（勿回潮）

- **无 README**：说明只维护本文件 + 必要 `docs/`。
- **无 Prettier / format:check**：CI 只构建与 smoke。
- **无 Cloudflare 一键脚本或仓库内配置指南**：相关设置仅在外部控制台维护。
- **搜索仅 Dialog**；保留 `?hl=` 页内高亮（URL 放 `data-*`，勿写入 JS 字面量，避免 `--minify` 破坏）。
- **仅 tags**；关于页社交为静态名片（无 shields.io / substats）。
- **字体**：全量分片 + 固定 preload 白名单，不用字扫描。
- **Favicon**：仅 `icons/favicon.svg` + `icons/apple-touch-icon.png`。
- **无** Microformats / 访问统计脚本 / i18n。
- **列表入口唯一**：`/archives/`；不生成 `/post/` section 根兼容页，文章实体地址仍为 `/post/:slug/`。
- **版本文件手动升级**：Hugo（`.hugo-version`）/ Node（`.node-version`）不在 Dependabot 覆盖内，升级靠手动改文件，CI 动态读取；本地 engines 由 `.npmrc` engine-strict 强制。
