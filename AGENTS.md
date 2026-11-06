# AGENTS.md

本文件是仓库的**唯一协作说明**（无 `README.md`），供人与 AI / 自动化助手共用：构建、架构、内容模型、代码写法与验证。

## 构建与开发命令

```bash
npm ci                    # 首次 / CI：按 lock 安装，勿用 npm install 漂移依赖
npm run lint              # 静态约定检查（scripts/check-conventions.mjs，零依赖，读源码不读产物）
npm run test              # 单元测试（node --test scripts/test/，零依赖）
npm run dev               # 本地 Hugo 开发服务器（含草稿，先同步字体；不生成/更新 Pagefind）
npm run build:site        # 仅 Hugo（--environment production --gc --minify --cleanDestinationDir）
npm run build:search      # 仅 Pagefind 索引（--site public）
npm run smoke             # 对 public/ 做构建后断言
npm run build             # 生产全流程：site + search + smoke
npm run sync:fonts        # Fontsource → static/fonts + assets/css/fonts.css + data/font_preload.json
npm run sync:fonts:stats  # 同上并打印分片体积统计
npm run preview           # 先构建 site + search 再 pagefind --serve 预览
npm run hugo:env          # 打印本机 Hugo 环境
```

维护（不进默认 CI）：

```bash
node scripts/normalize-frontmatter.mjs   # 重排 content front matter；移除 lastmod/categories，文章侧丢掉 toc: true；字段间注释挂到其后键随排序搬运
```

注意：

- `build:site` **必须**带 `--environment production`，以便 `layouts/robots.txt` 输出 `Allow: /`、正确 `baseURL` Sitemap 以及纪念页 `Disallow: /love.html` 与 `/love/`（三项均由 smoke 断言）。
- 若本机正在跑 `hugo server`，勿与 `build` 共用被污染的 `public/`（server 会写入 livereload）；构建前先停 server。
- Windows / PowerShell：`build:search` 会向 stderr 打印 `Pagefind doesn't support stemming for the language zh-cn.`，可能令 npm/PS 管道伪报 `NativeCommandError` 或 exit 1；属已知噪音，最终以 `npm run smoke` 输出 `ok` 为准。
- **不使用 Prettier** 或其它自动格式化；缩进/换行遵守 `.editorconfig`，其余按「代码写法约定」手写。
- **无** `cf:setup` / Cloudflare 一键脚本；Cloudflare 控制台配置不在仓库维护。
- Node：`.node-version` 是 CI 的唯一版本来源（`actions/setup-node` 的 `node-version-file`）；`package.json` `engines` 为最低线地板，本地由 `.npmrc` engine-strict 强制。本地 shell 不读 `.node-version`，版本靠自行切换，两者分工不同，勿视为"一致"
- Hugo：**extended**，版本见 `.hugo-version`（CI 动态读取；本文档不写具体版本号，只说「Hugo 新模板系统」）
- 字体在每次 `dev` / `build:site` 前由 `scripts/sync-fonts.mjs` 同步：依赖/源码未变化时按 `.fonts-manifest.json`（gitignore）比对跳过拷贝，`--force` 强制重拷

## 项目结构

```
config/_default/          # Hugo 配置
  hugo.yaml               # 站点、菜单、输出格式、安全策略等
  markup.yaml             # Goldmark、Chroma、TOC
  params.yaml             # 运营参数（作者、描述、主题色等）
layouts/                  # 站点模板（Hugo 新模板系统；已压平，无 themes/）
  baseof.html             # 全站壳
  home.html               # 首页
  home.rss.xml            # 首页 RSS（/rss.xml）
  single.html             # 通用单页（type: page）
  term.html               # 标签 term 列表
  taxonomy.html           # 标签总览（词云）
  _markup/                # render hooks
  _partials/              # 组件与工具 partials
  _shortcodes/            # 自定义 shortcodes
  post/                   # 文章 single
  archives/               # 文章归档普通页（type: archives）
assets/
  js/                     # 见下文「JS 拆分与 Concat」
  scss/                   # Dart Sass：main.scss 入口；token 在 utils/_variables.scss
  css/fonts.css           # sync-fonts 生成（gitignore）
data/                     # Socials.toml、SVG.toml；font_preload.json 由 sync-fonts 生成
content/                  # 内容（文章、关于、想法、普通归档页等）
static/                   # 原样发布；fonts/ 由构建生成
scripts/
  sync-fonts.mjs          # 字体全量分片 + latin/CJK 白名单 preload（manifest 增量）
  smoke-public.mjs        # 构建后 public/ 断言的入口：按序跑 scripts/checks/*.mjs
  checks/                 # smoke 的断言模块（context.mjs 提供公共辅助 + 各页面/产物 check）
  lib/                    # 可单测的纯函数（frontmatter.mjs：FM 切分/切块/重排）
  test/                   # node --test 单测（npm run test）
  check-conventions.mjs   # 静态约定检查（npm run lint）：文件层 + JS/SCSS/FM 硬规则
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
- **JS 拆分与 Concat**（`layouts/_partials/script.html`）：
  - **全站一包**：`theme.js` + `navigation.js` + `scroll-ui.js` → `resources.Concat` 为 `js/site.js` → Minify + Fingerprint（一个请求、源码分文件）。
  - **Concat 作用域**：三文件拼成**同一个** `type="module"`，顶层 `const` / `function` **共用作用域**。标识符必须在三文件间**全局唯一**（禁止两个文件都导出顶层 `init` / 同名 helper）。实现尽量收进各自 `init…()` 内部。由 `npm run lint` 断言。
  - **独立模块**（各一请求）：`search-dialog.js`（全站）；`article.js`（文章页，以及 `toc: true` 的普通页）；`search-highlight.js`（仅 `?hl=`，由 loader 注入）。
- **FOUC**：内联脚本在 `layouts/_partials/head.html`，与 `theme.js` 契约必须同步（见 `theme.js` 文件头）；同时给 `<html>` 标记 `.js`，移动导航只在该标记存在时折叠。
- **SEO**：`_partials/utils/seo.html`（author meta + OG + Twitter + JSON-LD）；OG/Twitter 图优先级：页级 `images` → 文章 bundle 首图 → `siteLogo` 兜底（头像）。
- **taxonomy**：仅 `tags`。
- **字体**：`@fontsource-variable/noto-serif-sc` + `@fontsource/source-code-pro` 自托管；`sync-fonts` 拷贝官方 index **全部分片**（不做站点用字扫描）。`data/font_preload.json` = latin + 固定 CJK 白名单（缺文件则跳过）；其余 CJK 靠 `unicode-range`。调试：`npm run sync:fonts:stats`。
- **搜索**：构建后 `pagefind --site public`；UI 为全站 Dialog + Default UI，但索引范围仅为文章；文章正文使用 `data-pagefind-body`，其它 Hugo 页面在 `<body>` 使用 `data-pagefind-ignore`；**无**独立 `/search/` 页。
- **RSS**：首页输出 `/rss.xml`；只收录 `Section == post` 的最近 20 篇摘要，`pubDate` 使用文章 `date`，不使用构建时钟或全文。
- **section 输出**：`disableKinds: ["section"]` 全局关闭 section 列表页；当前内容模型只需要文章实体与普通归档页。将来新增 section 时，必须显式评估是否需要重新启用对应输出。
- **CI/CD**：`main` 推送：`npm ci` → `lint` → `test` → `build:site --panicOnWarning` → `build:search` → `smoke` → deploy Pages；PR 只构建不部署，`workflow_dispatch` 亦可手动触发。**无** format 步骤。
- **域名 / CDN**：`baseURL` + `static/CNAME` → `https://owovo.xyz`；Cloudflare 代理仅在外部控制台维护。**勿**把 `baseURL` 改成 `*.github.io`；站点不为 `/post/` 根配置兼容重定向，也不做 Cloudflare 301。

## 代码写法约定

**分层**：本节规则分两档。「硬规则」由 `npm run lint`（`scripts/check-conventions.mjs`）在 CI 断言，违反即红灯；「软约定」靠人写与 review，不进机器。新增规则时先判断能否机器判定——能就去加检查器，否则写进软约定，不要写成两头不靠的口号。

### 硬规则（`npm run lint` 断言，违反即失败）

- 文件层：UTF-8、LF、文件末换行、无制表符、无行尾空白（markdown 除外，行尾两空格是硬换行语义）。
- `assets/js`：禁用 `var`（module 内一律 `const` / `let`）；不写 `"use strict"`（`type="module"` 已严格）。
- Concat 三文件（`theme.js` / `navigation.js` / `scroll-ui.js`）顶层 `const` / `let` / `function` / `class` **不得重名**——三文件拼成同一个作用域，重名即运行时报错。
- `assets/scss`：只用 `@use` / `@forward`，禁 `@import`；自有 class 禁 `__` BEM（第三方 `pagefind-ui__*` 除外）。
- `content`：必填 `title` `date` `slug` `description` `tags`；禁 `categories` / `lastmod`；文章不写 `toc: true`；`slug` 必须等于目录名。

### 软约定（人工遵守）

- 缩进：JS / SCSS / YAML / `scripts` 用 2 空格，`layouts/**` 用 4 空格（模板内 `<script>` 体内的 JS 用 2 空格）。
- JS：双引号优先；语句带分号；文件头写明职责与跨文件契约；结构为 常量/选择器 → 纯函数 → `init…()` → 文件末调用；DOM 缺失静默 `return`，仅失败路径 `console.error`。不要用脚本级 `{ … }` / IIFE 包一层（独立 module 天然隔离）。
- SCSS：partial 以 `_` 开头；入口只有 `main.scss`（按 base → themes → layout → components → pages → responsive 分组）；token 放 `utils/_variables.scss` 与主题 CSS 变量；嵌套建议 ≤ 3；新组件 = partial + `components/_*.scss`（+ 必要时 JS）并在 `main.scss` `@use`。
- 与模板的 `id` / `class` / `data-*` 是契约，改名必须两侧同改。
- 提交信息：`type(scope): 一句话摘要` + 空行 + 正文；摘要与正文都用简单直白的中文说清改了什么、为什么改；按变更类型拆分提交。

### 无障碍（既有实践，新增内容照此办理）

- 图标一律装饰性：`aria-hidden="true"`，可读文本由相邻节点或 `aria-label` 提供（`utils/icon.html` 已统一处理）。
- 跳转链接（skip link）保留在 `baseof.html` 首位，勿删。
- 语义元素优先：`<nav>` 带 `aria-label`，阅读进度用 `role="progressbar"` + `aria-valuemin/max/now`，折叠用原生 `<details>/<summary>`。
- 每页恰一个 `<h1>`；`<html lang>` 不可缺。二者由 smoke 部分断言，新增页仍须自查。
- 动效尊重 `prefers-reduced-motion`（`theme.js` / `search-highlight.js` 已有判断）。
- 焦点可见：交互元素保留 `:focus-visible` 样式，勿用 `outline: none` 抹掉。

### 测试

- 两层：`npm run test` 跑纯函数单测（`node --test scripts/test/`，秒级，无需构建）；`npm run smoke` 跑构建后对 `public/` 的产物断言（`scripts/smoke-public.mjs` 按序调 `scripts/checks/*.mjs`）。提交前跑 `npm run build` 即覆盖后者。
- 被测逻辑先抽到 `scripts/lib/`（如 `frontmatter.mjs`），再让脚本与检查器共用，单测直接 import 该模块。
- 页面/产物相关的新断言优先加在 `scripts/checks/` 对应模块；契约数字、SEO、Pagefind 范围都归 smoke。
- **不引入** Jest / Vitest / Playwright 等测试运行时。

### static/love/（豁免区）

`static/love.html` 与 `static/love/*` 是独立纪念页（约 1900 行，自带 IIFE 与 !important），**原样发布、不参与本文件的代码约定**，也不进 Hugo 构建与 Pagefind 索引。改动它们只需保证 robots 仍 `Disallow`（由 smoke 断言）。

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
| 关于         | `/about/`      | 通用单页（`type: page` + `toc: true`；无专壳）                   |
| 普通页       | 如 `/ideas/`   | `type: page` → `layouts/single.html`                            |
| 搜索         | （无独立 URL） | 全站 Dialog，结果仅文章                                       |
| 标签         | `/tags/`       | 唯一 taxonomy                                                   |

## 模板约定

- partial 字典传参：`{{ partial "utils/icon.html" (dict "$" . "name" "tag") }}`
- 路径小写、连字符
- 文章判断：`utils/is-post.html`；关于页无独立判断与专壳，按普通页（`type: page`）走 `layouts/single.html`
- 文章壳只在 `layouts/post/single.html`；归档壳在 `layouts/archives/single.html`；通用页不要复制文章壳
- 404：只 `define "main"`，共用 `baseof`（有搜索 Dialog；无 `?hl=` loader）
- 高亮 loader：`_partials/components/search-highlight-loader.html`；仅文章页在 head 调用
- 菜单搜索：`identifier: search`、`url: "#search"`、`data-search-trigger`；支持 `/#search` 与 hashchange
- 不要新增 `/search/` 页或 `categories` taxonomy
- 外链 render hook（`layouts/_markup/render-link.html`）：远程链接输出 `target="_blank" rel="external noopener noreferrer"`（由 smoke 断言）；`http(s)` / `mailto` 之外一律不 `safeURL`，交给 Hugo urlFilter 中和
- UI 文案简体中文硬编码，不走 i18n
- 资源管线：JS/CSS 一律 `Minify | Fingerprint`，引用带 `integrity` + `crossorigin="anonymous"`
- 输出敏感处用 `{{-` / `-}}` 修剪空白

## 文章操作

- 路径：`content/post/<slug>/index.md`
- slug：全小写 kebab-case（与目录名一致）
- 日期只使用 front matter 的 `date`；不使用 `lastmod`、`.Lastmod` 或自动生成的修改日期（HTML 侧由 smoke 断言；例外：`sitemap.xml` 由 Hugo 默认模板输出 `<lastmod>`，值即 `date`，为爬虫调度保留，勿当修改日期回流处理）
- 只用 `tags`
- TOC 默认开；关闭写 `toc: false`
- 转载：`source`（可选 `author`）；过时：`outdated` + 建议 `outdatedNote`
- 关于页：`type: page` + `toc: true`（无专壳，走通用单页）
- 图片放文章目录内引用（Hugo 可出响应式 WebP）
- permalink：`/post/:slug/`

## 验证

提交前（三步都要绿）：

```bash
npm run lint      # 静态约定检查，秒级，先跑它
npm run test      # 纯函数单测，秒级，无需构建
npm run build     # site + search + smoke
```

`lint` 读源码、`smoke` 读产物，二者互补：`lint` 拦写法，`smoke` 拦行为（SEO、Pagefind 范围、契约数字、无 `ZgotmplZ` 等）。CI 里 `lint` 与 `test` 都排在 `build:site` 之前，写错约定不用等完整构建。

`npm run dev` 仅启动 Hugo server，不会生成或更新 Pagefind 索引；需要验证搜索时使用 `npm run build` 或 `npm run preview`。

`smoke` 会按 HTML 路径检查文章与非文章的 Pagefind 标记、`/post/` 根不存在以及修改日期元数据不回流，文章抽样另断言 `og:image` 三级兜底；校验跨文件契约的**关系**而非具体数字（`:root` 是否导出 `--max-width` / `--content-width-px` / `--nav-close-timeout` / `--toc-side-breakpoint`，媒体查询是否用同一变量，JS 是否只读变量而不再写回退字面量，`render-image.html` 的 `sizes` 是否等于 `--content-width-px`）并全站扫描产物无 `ZgotmplZ`（链接协议被过滤的标志；正文确需讨论该字样时请改写措辞避开全文匹配）；不要将文章数量或 Pagefind 页数写死。

跨文件契约数字的唯一真源是 SCSS token（`$fontSize` / `$contentWidth` / `$duration` / `$tocSideBreakpoint`），经 `assets/scss/base/_responsive.scss` 与 `assets/scss/layout/_single.scss` 的 `:root` 导出为 CSS 变量；JS 与模板只读不写回退值，读不到变量就不启用对应功能。改 token 只动这两处，`smoke` 会兜住下游漂移。

模板改动建议：

```bash
npm run build:site -- --panicOnWarning --logLevel warn
```

`npm run dev` 手测：首页、文章、归档、标签、搜索 Dialog、关于、主题切换、移动导航、代码复制；带 `?hl=` 时高亮。

## 已知技术选择（勿回潮）

本节是**决策记录**，只写「为什么不做」，不重复上文已有的规则正文。

- **无 README**：说明只维护本文件 + 必要 `docs/`。
- **无 Prettier / format:check**：格式靠 `.editorconfig` + `npm run lint` 的少量硬规则，不做整库重排。
- **无 ESLint / TypeScript / 前端打包器**：`check-conventions.mjs` 零依赖手写，够用即止；不引入 TypeScript、webpack、Vite。
- **无 Cloudflare 一键脚本或仓库内配置指南**：相关设置仅在外部控制台维护。
- **搜索仅 Dialog**；保留 `?hl=` 页内高亮（URL 放 `data-*`，勿写入 JS 字面量，避免 `--minify` 破坏）。
- **关于页社交为静态名片**：不引入 shields.io / substats。
- **字体**：全量分片 + 固定 preload 白名单，不用字扫描。
- **Favicon**：仅 `icons/favicon.svg` + `icons/apple-touch-icon.png`。
- **无** Microformats / 访问统计脚本 / i18n。
- **版本文件手动升级**：Hugo（`.hugo-version`）/ Node（`.node-version`）不在 Dependabot 覆盖内，升级靠手动改文件，CI 动态读取；本地 engines 由 `.npmrc` engine-strict 强制。
