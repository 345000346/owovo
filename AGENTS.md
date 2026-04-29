# AGENTS.md

## 项目

Hugo 静态博客（中文，`zh-CN`），部署到 GitHub Pages（`owovo.xyz`）。主题是 MemE 的**个人 fork**，位于 `themes/meme`（submodule，`https://github.com/345000346/hugo-theme-meme.git`）。不要修改 submodule 的 URL。

## 命令

```bash
npm run dev          # hugo server -D（含草稿）
npm run build:site   # hugo --gc --minify → public/
npm run build:search # pagefind --site public
npm run build        # build:site + build:search
npm run format       # prettier --write .
npm run format:check # prettier --check .
```

**关键：** 始终通过 `node ./scripts/run-hugo.mjs` 运行 Hugo，不要直接使用 `hugo`。该脚本会将 `tools/` 注入 PATH，确保 Hugo 优先找到 sass shim。

## Sass 工具链

Hugo 使用 `dart-sass-embedded`（而非已弃用的 libsass）。两个 shim 文件桥接 Hugo 的 sass 调用：

- `tools/sass`（Unix）/ `tools/sass.cmd`（Windows）—— 入口
- `scripts/sass-shim.cjs` —— 解析 `dart-sass-embedded` 编译器二进制路径

## 内容结构

- 文章：`content/post/<slug>/index.md`（page bundle），固定链接：`/post/:slug/`
- 原型：默认 `draft: true` → 开发时使用 `-D` 查看草稿
- 摘要分隔：在正文中使用 `<!--more-->`
- 自定义页面：`content/about.md`、`content/ideas.md`

## 关键布局定制

- `layouts/partials/custom/head.html` —— 注入 `window.__BLOG_CONFIG__` 用于 Pagefind 国际化
- `assets/js/custom.js` —— 主题徽章（日间/夜间切换）+ Pagefind 搜索初始化
- `static/love.html` —— 独立私人纪念页（非 Hugo 模板，自带 `static/love/` 中的 CSS/JS，robots 禁止所有爬虫索引）

## 国际化

站点级覆盖在 `i18n/cn.yaml`（25 个键）。主题在 `themes/meme/i18n/zh-cn.toml` 中提供完整集合。添加翻译键前，先检查主题文件——可能已存在。

## CI（GitHub Actions）

工作流：`.github/workflows/gh-pages.yml`。流水线顺序：

1. Checkout（含子模块，`fetch-depth: 0`）
2. Node.js 22 + `npm ci`
3. 格式检查（`npm run format:check`）
4. Hugo 构建（捕获 stderr 中的 `deprecated|WARN` → `::warning::`）
5. Pagefind 搜索索引构建
6. 部署到 GitHub Pages

## Prettier 排除项

`archetypes/`、`content/`、`themes/meme/`、`static/love.*`、i18n YAML 以及构建产物均不进行格式化。
