# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm ci                    # 首次安装依赖
npm run dev               # 启动本地 Hugo 开发服务器（含草稿）
npm run build:site        # 仅构建 Hugo 站点（--gc --minify --cleanDestinationDir）
npm run build:search      # 仅生成 Pagefind 搜索索引
npm run build             # 完整生产构建（site + search）
npm run preview           # 构建后启动 Pagefind 预览服务
npm run format            # Prettier 格式化
npm run format:check      # 格式检查
```

Node 版本见 `.node-version`（>=24），Hugo 版本见 `.hugo-version`（0.161.1，需 extended 版）。

## 项目结构

```
config/_default/          # Hugo 配置
  hugo.yaml               # 站点、菜单、输出格式、安全策略等
  markup.yaml             # Goldmark (Markdown 渲染)、Chroma (代码高亮)、TOC
  params.yaml             # 主题参数（布局、社交、统计、第三方集成）
themes/owovo/             # 自有主题（MemE fork），独立维护
  assets/js/              # JS：main, scroll-ui, dark-mode, copy, nav-toggle, search 等
  assets/scss/            # Dart Sass：按 base/components/layout/pages/themes/utils 组织
  layouts/                # Hugo 模板
    _default/             # baseof.html, list.html, single.html, terms.html

    _default/_markup/     # render-heading/render-image/render-link/render-table（render hooks）
    partials/             # 组件 partials + 工具 partials
    partials/third-party/ # Vercount（访问统计）
    search/               # Pagefind 搜索页面
  i18n/zh-cn.toml         # 仅 zh-cn 语言包
  data/Libs.toml          # CDN 库路径（jsdelivr）
layouts/                  # 站点级模板覆盖
  shortcodes/             # 自定义 shortcodes
  robots.txt              # robots 模板
static/                   # 原样发布的静态资源（favicon, avatar 等）
assets/                   # 参与构建的前端资源（SCSS/JS 入口，主题外的增量）
data/Socials.toml         # 社交链接配置
archetypes/default.md     # 新文章 front matter 模板
```

## 架构要点

- **自含式主题**：`themes/owovo/` 是 MemE 的精简 fork，去除大量上游兼容项（多评论、多搜索、PWA、多语言等，KaTeX/Mermaid 集成也已移除），保留基础博客功能和 Pagefind 搜索、暗色模式。
- **Dart Sass 编译链**：主题样式通过 `themes/owovo/assets/scss/main.scss` 入口编译，使用 Dart Sass（`sass-embedded`），仓库不使用 LibSass 或 Node Sass。
- **Markdown render hooks**：在 `themes/owovo/layouts/_default/_markup/` 自定义了标题（添加锚点）、图片（懒加载）、链接、表格的渲染。
- **第三方库**：通过 jsdelivr CDN 加载的库路径配置在 `themes/owovo/data/Libs.toml`（当前仅 clipboard、vercount），可在站点级 `data/Libs.toml` 覆盖。
- **Pagefind 搜索**：构建后运行 `npx pagefind --site public` 生成搜索索引，前台由 `themes/owovo/layouts/search/list.html` 驱动。
- **CI/CD**：GitHub Actions（`.github/workflows/gh-pages.yml`）在 main 分支推送时构建并部署到 GitHub Pages，流程包括 format:check → build:site → build:search → upload-pages-artifact → deploy-pages。

## 模板约定

- Hanf Luo 的 Hugo partials 使用字典传参模式：`{{ partial "utils/icon.html" (dict "$" . "name" "tag") }}`，子 partial 通过 `{{ $ := index . "$" }}` 取回页面上下文。
- 命名风格：小写路径，连字符分隔，如 `layouts/partials/components/post-meta.html`。

## 文章操作

- 新文章：在 `content/post/<slug>/index.md` 创建，front matter 参考 `archetypes/default.md`。
- 分类和标签在 front matter 中声明，通过 Hugo taxonomy 系统自动聚合。
- permalink 格式：`/post/:slug/`
- `disablePathToLower: true` — slug 保留原始大小写。

## 验证

提交前至少运行：

```bash
npm run format:check
npm run build
```

涉及主题/样式/模板变更时，用 `npm run dev` 手动检查首页、文章页、列表页、搜索页、关于页。

## 已知技术选择

- **Pagefind 搜索使用 Default UI**：从 Pagefind 1.5.0 起新集成推荐 Component UI，但本项目沿用 Default UI（`themes/owovo/layouts/search/list.html` 引入 `pagefind-ui.js`）。原因是 Default UI 的视觉风格更贴合本主题。属有意选择，无障碍与定制性差异在可接受范围内，请勿擅自迁移。
