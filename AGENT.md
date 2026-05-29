# AGENT.md

本文件为 AI 编码代理提供此仓库的上下文指引。

## 项目概览

Hugo 静态博客，中文内容，部署于 GitHub Pages（`owovo.xyz`）。作者 LIGT。

- **框架**: Hugo 0.161.1 Extended（含 Dart Sass）
- **主题**: MemE 的个人 fork，通过 Git submodule 引入（`themes/meme`）
- **部署**: GitHub Actions → GitHub Pages
- **运行时**: Node 24，PostCSS + autoprefixer 处理 CSS

## 目录结构

```
.
├── archetypes/           # 文章原型模板
├── config/_default/      # Hugo 配置（三文件结构）
│   ├── hugo.yaml         # 核心配置
│   ├── params.yaml       # 主题参数
│   └── markup.yaml       # 渲染与高亮
├── content/              # 内容（Markdown）
│   ├── post/             # 文章（page bundle）
│   ├── about.md          # 关于页
│   ├── ideas.md          # 想法页
│   └── search/           # 搜索页
├── data/                 # 模板数据
│   └── Socials.toml
├── layouts/              # 模板覆盖（仅 robots.txt）
├── static/               # 静态资源
│   ├── images/avatar.webp
│   ├── icons/
│   └── favicon.ico
├── themes/meme/          # 主题子模块（勿修改 URL）
├── .github/workflows/    # CI/CD
├── .editorconfig
├── .hugo-version
├── .node-version
├── .gitignore
├── .prettierignore
├── postcss.config.js
└── package.json
```

## 配置架构

三文件分离，各司其职：

| 文件 | 职责 |
|------|------|
| `hugo.yaml` | baseURL、title、theme、menu、permalinks、outputFormats、security |
| `params.yaml` | 主题参数：作者、UI 样式、功能开关（暗色模式/搜索/版权等） |
| `markup.yaml` | Goldmark 渲染（允许 unsafe HTML）、TOC、Chroma 代码高亮 |

关键配置细节：
- URL 保留原始大小写（`disablePathToLower: true`）
- 启用 CJK 支持（正确统计中文字数）
- PostCSS 通过 `build.use: "postcss"` 集成
- 安全策略仅允许 `postcss` 和 `node` 命令

## 内容结构

- **文章**: `content/post/<slug>/index.md`（page bundle），永久链接 `/post/:slug/`
- **Section 列表页**: `_index.md` 定义各 section 的 front matter
  - `content/post/_index.md` → 文章列表
  - `content/archives/_index.md` → 文章归档
  - `content/search/_index.md` → 搜索页
- **独立页面**: `about.md`、`ideas.md`
- **摘要分隔**: 正文中使用 `<!--more-->`
- **原型模板**: `archetypes/default.md`（含 toc、tags、categories 等字段）
- **新文章默认 draft: true**

## 关键命令

```bash
npm run dev          # 开发服务器（含草稿）
npm run build:site   # 生产构建 → public/
npm run build:search # Pagefind 搜索索引
npm run build        # build:site + build:search
npm run hugo:env     # 查看 Hugo 环境信息
npm run format       # Prettier 格式化
npm run format:check # CI 格式检查（只读）
```

直接使用 `hugo` 命令，无需包装脚本。Hugo Extended 已内置 Dart Sass。

## 搜索

由 **Pagefind** 驱动，搜索页入口 `content/search/_index.md`。
构建后索引生成于 `public/pagefind/`，部署前会验证 `pagefind.js` 和 `pagefind-entry.json` 存在。

## CI/CD（GitHub Actions）

推送 `main` 分支触发（`gh-pages.yml`）：

1. Checkout（含子模块）
2. 从 `.hugo-version` 读取版本，安装 Hugo Extended
3. 从 `.node-version` 读取版本，安装 Node，`npm ci`
4. Prettier 格式检查
5. Hugo 构建（`--minify --gc`）
6. Pagefind 索引构建
7. 验证 Pagefind 产物
8. 上传 `public/` 为 Pages artifact 并部署

缓存策略：Hugo 资源缓存键包含 Hugo 版本、`package-lock.json`、config YAML、子模块状态。

## 社交媒体

配置位于 `data/Socials.toml`，通过主题模板渲染：
- RSS、GitHub、微博、知乎

## 编辑器 / 格式化

- **Prettier**: 使用 `prettier-plugin-go-template` 插件处理 Go 模板。排除范围见 `.prettierignore`。
- **EditorConfig**: 统一缩进（2 空格）、UTF-8、LF 换行。

## 重要提示

- **主题子模块**: `themes/meme` 指向个人 fork，**不要修改其 URL**
- **依赖安装**: 首次用 `npm ci`，仅在需要更新 lock 文件时用 `npm install`
- **新建文章**: `hugo new post/<slug>` 或手动创建 `content/post/<slug>/index.md`
- **国际化**: 翻译由主题在 `themes/meme/i18n/zh-cn.toml` 中提供，新增翻译键前先检查主题文件
