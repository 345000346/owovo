# AGENTS.md

本文件为在本仓库中协作的 AI / 自动化助手提供项目约定与操作指引。

## 构建与开发命令

```bash
npm ci                    # 首次安装依赖（始终用 ci，勿用 npm install 漂移 lock）
npm run dev               # 启动本地 Hugo 开发服务器（含草稿，先同步字体）
npm run build:site        # 仅构建 Hugo 站点（--gc --minify --cleanDestinationDir）
npm run build:search      # 仅生成 Pagefind 搜索索引
npm run build             # 完整生产构建（site + search）
npm run preview           # 构建后启动 Pagefind 预览服务
npm run format            # Prettier 格式化
npm run format:check      # 格式检查
```

- Node 版本见 `.node-version`（`>=24.18.0`）
- Hugo 版本见 `.hugo-version`（`0.164.0`，需 **extended** 版）
- 字体在每次 `dev` / `build:site` 前由 `scripts/sync-fonts.mjs` 同步

## 项目结构

```
config/_default/          # Hugo 配置
  hugo.yaml               # 站点、菜单、输出格式、安全策略等
  markup.yaml             # Goldmark、Chroma、TOC
  params.yaml             # 运营参数（作者、描述、主题色等）
layouts/                  # 站点模板（已压平，不再使用 themes/）
  _default/               # baseof、list、single、terms + render hooks
  partials/               # 组件与工具 partials
  search/                 # Pagefind 搜索页
  shortcodes/             # 自定义 shortcodes
assets/
  js/                     # ES modules：theme、navigation、scroll-ui、article、badges、search
  scss/                   # Dart Sass：main.scss 为入口，视觉 token 在 utils/_variables.scss
  css/fonts.css           # 由 sync-fonts 生成（gitignore）
data/                     # Socials.toml、SVG.toml
content/                  # 内容
static/                   # 原样发布的静态资源（fonts/ 由构建生成，gitignore）
scripts/sync-fonts.mjs    # 按站点用字子集同步 Fontsource 字体
archetypes/default.md     # 新文章 front matter 模板
```

## 架构要点

- **单站点应用**：不再使用 `theme: owovo` 主题边界；`layouts` / `assets` 均在仓库根目录。
- **单语（简体中文）**：不使用 Hugo i18n；UI 文案直接写在模板中。`defaultContentLanguage: zh-cn` 与 `locale` 仍用于 `lang` / SEO / Pagefind。
- **配置最小化**：视觉常量进入 SCSS，功能默认写死在模板中；`params` 只保留作者、描述、主题色等运营数据。
- **Dart Sass**：`assets/scss/main.scss` 通过 `css.Sass`（`dartsass` + `sass-embedded`）编译；SCSS 使用 `@use` 模块系统。
- **JS 按能力拆分**：
  - 全站：`theme.js`、`navigation.js`、`scroll-ui.js`
  - 文章页：`article.js`（代码复制）
  - 关于页：`themed-badges.js`（社交徽章明暗主题）
  - 搜索页：Pagefind Default UI + `search.js`
  - 带 `?hl=` 时按需加载 `search-highlight.js`
- **字体**：`@fontsource-variable/noto-serif-sc` + `@fontsource/source-code-pro` 自托管；`sync-fonts` 扫描可见文案（`content` / `layouts`），按 `unicode-range` 过滤 Fontsource 官方 `index.css` 并只复制命中分片（始终包含 latin / latin-ext），不重写 `@font-face` 模板。
- **Pagefind 搜索**：构建后 `pagefind --site public`；**Default UI 为有意选择**，请勿擅自迁移 Component UI。
- **CI/CD**：GitHub Actions 在 main 推送时 `format:check` → `build` → deploy Pages；PR 只构建不部署。

## 模板约定

- partials 传参可使用字典：`{{ partial "utils/icon.html" (dict "$" . "name" "tag") }}`
- 命名风格：小写路径，连字符分隔
- 判断文章页优先使用 `partial "utils/is-post.html"`，不要散落 `eq .Section "post"`
- UI 文案直接写简体中文，不要再引入 `i18n/` 或 `{{ i18n }}`
- 外链在 render hook 中统一 `target="_blank" rel="external noopener"`
- JS / CSS 经 `resources.Minify | resources.Fingerprint`，模板输出 `integrity` 与 `crossorigin="anonymous"`
- `layouts/` 不纳入 Prettier（Go template 插件对部分语法不兼容）；其余文件走 `format:check`

## 文章操作

- 新文章：`content/post/<slug>/index.md`，front matter 参考 `archetypes/default.md`
- 转载用 `source: <url>`；`outdated: true` 显示归档提示；`toc: false` 可关闭目录
- permalink：`/post/:slug/`
- `disablePathToLower: true` — slug 保留原始大小写
- 本地图片放在文章目录内引用；Hugo 会生成响应式 WebP

## 验证

提交前至少运行：

```bash
npm run format:check
npm run build
```

涉及样式 / 模板变更时，用 `npm run dev` 检查：首页、文章页、列表页、搜索页、关于页。

CI 构建额外使用 `--panicOnWarning --logLevel warn`，本地改模板时建议同样验证：

```bash
npm run build:site -- --panicOnWarning --logLevel warn
```

## 已知技术选择

- **Pagefind 搜索使用 Default UI**：视觉风格更贴合本站，请勿擅自迁移 Component UI。
- **SCSS 使用 `@use` 模块系统**：入口与各 partial 均已迁移，新增样式请继续用 `@use`，不要引入 `@import`。
- **无访问统计脚本**：历史上的 Vercount 相关代码已移除；若重新接入统计，需完整补齐脚本、模板、样式与隐私说明。
- **无 i18n 层**：单语站直接硬编码简体中文；若将来要多语言，再引入 `i18n/` 与 `{{ i18n }}`。
- **独立页 `static/love.html`**：不走 Hugo 模板管线，已 `noindex`；修改时勿与主站 partial 混用假设。
