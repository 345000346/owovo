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

Node 版本见 `.node-version`（>=24），Hugo 版本见 `.hugo-version`（0.164.0，需 extended 版）。

## 项目结构

```
config/_default/          # Hugo 配置
  hugo.yaml               # 站点、菜单、输出格式、安全策略等
  markup.yaml             # Goldmark、Chroma、TOC
  params.yaml             # 少量站点参数（作者、描述、主题色、字体链接）
layouts/                  # 站点模板（已压平，不再使用 themes/）
  _default/               # baseof、list、single、terms + render hooks
  partials/               # 组件与工具 partials
  search/                 # Pagefind 搜索页
  shortcodes/             # 自定义 shortcodes
assets/
  js/                     # ES modules：theme、navigation、scroll-ui、article、badges、search
  scss/                   # Dart Sass：main.scss 为入口，视觉 token 在 utils/_variables.scss
data/                     # Socials.toml、SVG.toml
i18n/zh-cn.toml           # 仅 zh-cn 语言包
content/                  # 内容
static/                   # 原样发布的静态资源
archetypes/default.md     # 新文章 front matter 模板
```

## 架构要点

- **单站点应用**：不再使用 `theme: owovo` 主题边界；layouts/assets/i18n 均在仓库根目录。
- **配置最小化**：视觉常量进入 SCSS，功能默认写死在模板中；params 只保留作者、描述、主题色、字体链接等运营数据。
- **Dart Sass**：`assets/scss/main.scss` 通过 `css.Sass`（dartsass）编译，无 Hugo ExecuteAsTemplate 注入。
- **JS 按能力拆分**：全站加载 theme/navigation/scroll-ui/badges；文章页额外加载 article.js（代码复制）；搜索页加载 Pagefind。
- **Pagefind 搜索**：构建后 `pagefind --site public`；Default UI 为有意选择。
- **CI/CD**：GitHub Actions 在 main 推送时 format:check → build → deploy Pages。

## 模板约定

- partials 传参可使用字典：`{{ partial "utils/icon.html" (dict "$" . "name" "tag") }}`。
- 命名风格：小写路径，连字符分隔。

## 文章操作

- 新文章：`content/post/<slug>/index.md`，front matter 参考 `archetypes/default.md`。
- 转载用 `source: <url>`；`outdated: true` 显示归档提示；`toc: false` 可关闭目录。
- permalink：`/post/:slug/`
- `disablePathToLower: true` — slug 保留原始大小写。

## 验证

提交前至少运行：

```bash
npm run format:check
npm run build
```

涉及样式/模板变更时，用 `npm run dev` 检查首页、文章页、列表页、搜索页、关于页。

## 已知技术选择

- **Pagefind 搜索使用 Default UI**：视觉风格更贴合本站，请勿擅自迁移 Component UI。
- **SCSS 仍使用 `@import`**：`silenceDeprecations` 暂保留；完整 `@use` 迁移可单独进行。
