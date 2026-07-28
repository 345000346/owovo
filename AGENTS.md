# AGENTS.md

本文件为在本仓库中协作的 AI / 自动化助手提供项目约定与操作指引。

## 构建与开发命令

```bash
npm ci                    # 首次安装依赖（始终用 ci，勿用 npm install 漂移 lock）
npm run dev               # 启动本地 Hugo 开发服务器（含草稿，先同步字体）
npm run build:site        # 仅构建 Hugo（--environment production --gc --minify --cleanDestinationDir）
npm run build:search      # 仅生成 Pagefind 搜索索引
npm run smoke             # 对 public/ 做构建后断言（robots/sitemap/SRI/Pagefind/字体 preload 等）
npm run build             # 完整生产构建（site + search + smoke）
npm run sync:fonts        # 同步 Fontsource 分片 → static/fonts + assets/css/fonts.css + data/font_preload.json
npm run sync:fonts:stats  # 同上并打印分片体积统计
npm run preview           # 构建后启动 Pagefind 预览服务
npm run format            # Prettier 格式化
npm run format:check      # 格式检查
```

- `build:site` **必须**带 `--environment production`，以便 `layouts/robots.txt` 输出 `Allow: /` 与正确 `baseURL` Sitemap。
- 若本机正在跑 `hugo server`，勿与 `build` 共用被污染的 `public/`（server 会写入 livereload）；构建前先停 server。

- Node 版本见 `.node-version`（`>=24.18.0`）
- Hugo 版本见 `.hugo-version`（`0.164.0`，需 **extended** 版）
- 字体在每次 `dev` / `build:site` 前由 `scripts/sync-fonts.mjs` 同步（并生成 `data/font_preload.json`）

## 项目结构

```
config/_default/          # Hugo 配置
  hugo.yaml               # 站点、菜单、输出格式、安全策略等
  markup.yaml             # Goldmark、Chroma、TOC
  params.yaml             # 运营参数（作者、描述、主题色等）
layouts/                  # 站点模板（已压平，不再使用 themes/）
  _default/               # baseof、list、single、terms + render hooks、404
  post/                   # 文章 single + section 列表（/post/ 重定向到 /archives/）
  partials/               # 组件与工具 partials
  shortcodes/             # 自定义 shortcodes
assets/
  js/                     # ES modules：theme / navigation / scroll-ui（Concat 为 site.js）、article、search-dialog、search-highlight
  scss/                   # Dart Sass：main.scss 为入口，视觉 token 在 utils/_variables.scss
  css/fonts.css           # 由 sync-fonts 生成（gitignore）
data/                     # Socials.toml、SVG.toml；font_preload.json 由 sync-fonts 生成（gitignore）
content/                  # 内容
static/                   # 原样发布的静态资源（fonts/ 由构建生成，gitignore）；love.* 为同域独立项目
scripts/sync-fonts.mjs    # 同步 Fontsource 全部分片 + latin/CJK 白名单 preload
scripts/smoke-public.mjs  # 构建后 public/ 断言
archetypes/default.md     # 新文章 front matter 模板
```

## 架构要点

- **单站点应用**：不再使用 `theme: owovo` 主题边界；`layouts` / `assets` 均在仓库根目录。
- **单语（简体中文）**：不使用 Hugo i18n；UI 文案直接写在模板中。`defaultContentLanguage: zh-cn` 与 `locale` 仍用于 `lang` / SEO / Pagefind。
- **配置最小化**：视觉常量进入 SCSS，功能默认写死在模板中；`params` 只保留作者、描述、主题色等运营数据。`themeColor` / `themeColorDark` 为必填。
- **Dart Sass**：`assets/scss/main.scss` 通过 `css.Sass`（`dartsass` + `sass-embedded`）编译；SCSS 使用 `@use` 模块系统。
- **JS 按能力拆分**：
  - 全站源码：`theme.js`、`navigation.js`、`scroll-ui.js`；构建时 `resources.Concat` 为单一 `js/site.js` 再 Minify + Fingerprint（一请求、源码分文件）
  - FOUC 内联脚本与 `theme.js` 共用契约（见 `theme.js` 文件头注释）
  - 文章页：`article.js`（代码复制）
  - 搜索：全站 Dialog（`search-dialog.js` + Pagefind Default UI，菜单/`/`/`Ctrl+K` 打开）；无独立 `/search/` 页
  - 带 `?hl=` 时：`search-highlight-loader`（`<template data-*>` + 内联 loader）注入 `search-highlight.js` → `import` Pagefind highlight（URL 只放 data-*，不进 JS 字面量）
  - taxonomy 仅 `tags`（其它 `warnf` + 可见兜底文案）
  - SEO 出口：`partials/utils/seo.html`（author meta + OG + Twitter + JSON-LD）
- **字体**：`@fontsource-variable/noto-serif-sc` + `@fontsource/source-code-pro` 自托管；`sync-fonts` 同步官方 `index.css` 中的**全部** `@font-face` 分片（不做站点用字扫描），不重写模板结构，只改 family 名与 `url(/fonts/…)`。`data/font_preload.json` 预载 **latin + 固定 CJK 白名单**（缺文件则跳过）；其余 CJK 靠 `unicode-range` 按需加载。调试：`npm run sync:fonts:stats`。
- **Pagefind 搜索**：构建后 `pagefind --site public`；UI 入口为全站 Dialog + Default UI。
- **CI/CD**：GitHub Actions 在 main 推送时 `format:check` → `build` → deploy Pages；PR 只构建不部署。
- **域名 / CDN**：生产域 `owovo.xyz`（`baseURL` + `static/CNAME`）；无备案时用 Cloudflare 代理 GitHub Pages，步骤见 `docs/cloudflare.md`。一键：`CLOUDFLARE_API_TOKEN` + `GITHUB_PAGES_HOST` 后 `npm run cf:setup`（会删 apex/www 冲突 DNS；默认严格 exit 1；`CF_DRY_RUN=1` 预览；勿改 baseURL 为 `*.github.io`）。`/post/` → `/archives/` 仅用站点内 HTML/JS 重定向，**不做** Cloudflare 301。

## 内容模型（列表职责）

| 角色         | 路径           | 说明                                                            |
| ------------ | -------------- | --------------------------------------------------------------- |
| 文章实体     | `/post/:slug/` | `content/post/<slug>/index.md`；模板 `layouts/post/single.html` |
| 权威文章列表 | `/archives/`   | 菜单「文章」入口；`where Section==post`，按年分组               |
| 首页         | `/`            | 同一批文章，摘要 + 分页（不是归档的替代）                       |
| section 根   | `/post/`       | **不作为列表**；`layouts/post/list.html` 重定向到 `/archives/`  |
| 关于         | `/about/`      | `layout: about`（显式身份）                                     |
| 普通页       | 如 `/ideas/`   | `type: page`，走 `layouts/_default/single.html`                 |
| 搜索         | （无独立 URL） | 全站 Dialog + Pagefind Default UI                               |
| 标签         | `/tags/`       | 唯一 taxonomy                                                   |
| 同域独立项目 | `/love.html`   | `static/love.html` + `static/love/`；不进 Hugo 模板与 Pagefind  |

## 模板约定

- partials 传参可使用字典：`{{ partial "utils/icon.html" (dict "$" . "name" "tag") }}`
- 命名风格：小写路径，连字符分隔
- 判断文章页使用 `partial "utils/is-post.html"`（`IsPage` 且 `Section == post`），不要散落 Section 判断；文章专属 UI 写在 `layouts/post/single.html`，勿再堆进通用 single
- 判断关于页使用 `partial "utils/is-about.html"`（front matter `layout: about`），不要用 ContentBaseName / 路径推断
- 通用页：`layouts/_default/single.html`（meta + 可选 `toc: true` + body）；文章壳勿复制到普通页
- 404：`layouts/404.html` 只 `define "main"`，共用 `baseof`（含顶栏页脚与搜索 Dialog；无 `?hl=` loader）
- 搜索高亮 loader：`partials/components/search-highlight-loader.html`；非 404 页在 head 中调用
- 菜单「搜索」：`identifier: search` + `url: "#search"` + `data-search-trigger`；`/#search` 与 hashchange 会自动打开 Dialog；不要再加 `/search/` 页
- UI 文案直接写简体中文，不要再引入 `i18n/` 或 `{{ i18n }}`
- 外链在 render hook 中统一 `target="_blank" rel="external noopener"`
- JS / CSS 经 `resources.Minify | resources.Fingerprint`，模板输出 `integrity` 与 `crossorigin="anonymous"`
- `layouts/` 不纳入 Prettier（Go template 与 Prettier 不兼容）；其余文件走 `format:check`

## 文章操作

- 新文章：`content/post/<slug>/index.md`，front matter 参考 `archetypes/default.md`
- 新 slug 必须全小写 kebab-case（已关闭 `disablePathToLower`，路径会规范为小写）
- 只用 `tags`，**不要**写 `categories`
- 转载用 `source: <url>`；`outdated: true` 显示归档提示；`toc: false` 可关闭目录（文章默认开 TOC）
- 关于页须带 `layout: about`（及通常 `type: page`）；普通独立页用 `type: page` 即可
- permalink：`/post/:slug/`
- 本地图片放在文章目录内引用；Hugo 会生成响应式 WebP

## 验证

提交前至少运行：

```bash
npm run format:check
npm run build            # 已含 smoke；勿在 hugo server 占用 public 时执行
```

涉及样式 / 模板变更时，用 `npm run dev` 检查：首页、文章页、归档、标签、搜索 Dialog、关于页。

CI 构建额外使用 `--panicOnWarning --logLevel warn`，本地改模板时建议同样验证：

```bash
npm run build:site -- --panicOnWarning --logLevel warn
```

## 已知技术选择

- **搜索只保留全站 Dialog**：Pagefind Default UI 懒加载；菜单 / `Ctrl+K` / `/` 打开；**无**独立 `/search/` 页。
- **搜索结果页内高亮（`?hl=`）保留**：Dialog 的 `processResult` 为结果 URL 追加 `hl`；页内见 `partials/components/search-highlight-loader.html`；资源 URL 放在 `<template id="search-highlight-config">` 的 `data-*`，loader 用 `getAttribute` 读取（勿把 Fingerprint URL 写进 JS 字面量 / `dataset.x =`，Hugo `--minify` 会破坏）。
- **仅 tags taxonomy**：已关闭 `categories`；菜单「标签」为唯一分类入口。
- **关于页社交为静态名片**：本地 mark + 文案 + 外链；**无** shields.io / substats / `themed-badges.js`。
- **字体同步不做用字扫描**：拷贝 Noto 官方 index 全部分片 + Source Code Pro；preload = latin + 固定 CJK 文件名白名单。
- **SCSS 使用 `@use` 模块系统**：入口与各 partial 均已迁移，新增样式请继续用 `@use`，不要引入 `@import`。
- **Favicon**：仅 `icons/favicon.svg` + `icons/apple-touch-icon.png`（无 ICO/96 PNG）。
- **无 Microformats**（`h-entry` 等已移除）；结构化数据以 JSON-LD + OG + Twitter 为准。
- **无访问统计脚本**：历史上的 Vercount 相关代码已移除；若重新接入统计，需完整补齐脚本、模板、样式与隐私说明。
- **无 i18n 层**：本站单语，硬编码简体中文。
- **`static/love.html` + `static/love/`**：同域托管的**独立项目**，不走 Hugo 模板 / Pagefind；已 `noindex`；勿与主站 partial 混用。
- **文章列表入口唯一**：菜单与外链用 `/archives/`；`/post/` section 根仅站点内重定向（**不做** Cloudflare 301），避免与归档双列表。
