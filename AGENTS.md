# Repository Guidelines

## 项目概览

本仓库是基于 Hugo 的个人静态博客，内容以中文为主，部署到 GitHub Pages。主题已内置在 `themes/owovo/`，作为本站专用主题维护，不再按 submodule 或通用主题处理。

## 目录结构

- `config/_default/`：Hugo 配置，包括站点、主题参数和 Markdown 渲染配置。
- `content/`：站点内容，文章位于 `content/post/<slug>/index.md`。
- `archetypes/`：新内容的 front matter 模板。
- `layouts/`：站点级模板覆盖、partials、shortcodes 和 `robots.txt`。
- `assets/`：参与构建处理的前端资源。
- `static/`：原样发布的静态资源。
- `data/`：模板使用的数据文件。
- `themes/owovo/`：本站自有主题代码。
- `public/`、`resources/`：构建产物或缓存，不应提交。

## 开发与构建命令

首次安装依赖：

```bash
npm ci
```

常用命令：

```bash
npm run dev          # 启动本地 Hugo 开发服务器，包含草稿
npm run build        # 生产构建并生成 Pagefind 搜索索引
npm run build:site   # 仅构建 Hugo 站点
npm run build:search # 仅生成搜索索引
npm run format       # 使用 Prettier 格式化
npm run format:check # 检查格式
```

Node 版本以 `.node-version` 为准，Hugo 版本以 `.hugo-version` 为准。

## 编码与格式规范

遵循 `.editorconfig`：UTF-8、LF、2 空格缩进、文件末尾换行。支持的文件使用 Prettier 格式化；排除范围见 `.prettierignore`。Hugo 模板、partials 和 shortcodes 使用清晰的小写路径命名，例如 `layouts/partials/utils/title.html`。

## 验证要求

仓库当前没有独立单元测试。提交前至少运行：

```bash
npm run format:check
npm run build
```

涉及主题、样式、模板或导航结构时，还应运行 `npm run dev` 并手动检查首页、文章页、列表页、搜索页和关于页。

## 提交与 PR 规范

commit message 使用中文 changelog 风格：

```text
类型: 内容
```

常用类型包括：`新增`、`修复`、`调整`、`移除`、`文档`、`测试`、`重构`、`构建`。

示例：

```text
修复: 处理搜索索引构建失败
文档: 更新主题维护说明
```

PR 应说明变更内容、验证方式、相关 issue；涉及视觉变化时附截图。配置、部署或内容结构变化需要明确标注影响范围。

## 代理协作规则

默认使用中文沟通。代码、命令、变量名、日志、报错和 API 名称保留英文。不要回滚用户已有改动，除非用户明确要求。发现更直接或更稳妥的做法时，说明原因并推进。
