# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Hugo 静态博客（中文 `zh-CN`），部署到 GitHub Pages（`owovo.xyz`）。主题为 MemE 的个人 fork，通过 Git submodule 引入（`themes/meme`，勿修改其 URL）。Hugo 版本由 `.hugo-version` 统一管理。

## 环境与安装

- Node 24（见 `.node-version`），Hugo 0.161.1（见 `.hugo-version`）
- `npm ci` 安装依赖（首次）；`npm install` 仅在需要更新 `package-lock.json` 时使用
- 新建文章：`hugo new post/<slug>` 生成 page bundle，或手动创建 `content/post/<slug>/index.md`

## 关键命令

```bash
npm run dev          # 开发服务器，包含草稿
npm run build:site   # 生产构建 → public/
npm run build:search # Pagefind 搜索索引
npm run build        # build:site + build:search
npm run hugo:env     # 输出 Hugo 运行环境信息
npm run format       # Prettier 格式化
npm run format:check # CI 格式检查（只读）
```

## Hugo 运行规则

**始终使用 `node ./scripts/run-hugo.mjs` 调用 Hugo，禁止直接使用 `hugo`。** 封装脚本将 `tools/` 注入 PATH，使 Hugo 找到 sass shim（`tools/sass` 或 `tools/sass.cmd`），再由 `scripts/sass-shim.cjs` 桥接到 `dart-sass-embedded` 的编译器二进制文件。

## 内容结构

- 文章：`content/post/<slug>/index.md`（page bundle），固定链接 `/post/:slug/`
- 新建文章默认 `draft: true`，需 `npm run dev` 才能在本地看到
- 摘要分隔：正文中使用 `<!--more-->`
- 自定义页面：`content/about.md`、`content/ideas.md`、`content/search/_index.md`（Pagefind 搜索）、`content/archives/_index.md`（归档）
- 数据文件：`data/` 目录存放模板数据（如 `data/Socials.toml`），供 Hugo 模板通过 `$.Site.Data` 访问
- 原型：`archetypes/default.md` 定义新文章的 front matter 模板

## 布局定制

- `static/love.html` — 独立私人页面，非 Hugo 模板，自带 `static/love/` 中的 CSS/JS，robots 禁止索引

## 国际化

所有翻译由主题在 `themes/meme/i18n/zh-cn.toml` 中提供。新增翻译键前先检查主题文件。

## CI/CD

`.github/workflows/gh-pages.yml`：推送到 `main` 时触发，Hugo 版本从 `.hugo-version` 读取。流水线：checkout（含子模块）→ 安装 Hugo + Node → 格式检查 → Hugo 构建 → Pagefind 索引 → 验证 Pagefind 产物 → 部署到 GitHub Pages。缓存键含 Hugo 版本、`package-lock.json`、`.gitmodules`、config yaml。

## Prettier 排除范围

`archetypes/`、`content/`、`layouts/`、`themes/meme/`、`static/love.html`、`static/love/`、`config/_default/markup.yaml`、`config/_default/params.yaml`、`postcss.config.js`、构建产物均不格式化。

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
