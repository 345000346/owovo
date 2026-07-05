# AGENT.md

本文件为 AI 编码代理提供此仓库的上下文指引。

## 项目概览

Hugo 静态博客，中文内容，部署于 GitHub Pages（`owovo.xyz`）。作者 LIGT。

- **框架**: Hugo 0.161.1 Extended（含 Dart Sass）
- **主题**: MemE 的个人 fork，通过 Git submodule 引入（`themes/meme`）
- **部署**: GitHub Actions → GitHub Pages
- **运行时**: Node 24，PostCSS + autoprefixer 处理 CSS，`sass-embedded` 提供 Dart Sass 可执行文件
- **搜索**: Pagefind
- **主题策略**: `themes/meme` 是站点专用 fork，不再兼容原 MemE 的完整功能矩阵

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
│   ├── archives/         # 归档页
│   ├── about.md          # 关于页
│   ├── ideas.md          # 想法页
│   └── search/           # 搜索页（Pagefind）
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

| 文件          | 职责                                                             |
| ------------- | ---------------------------------------------------------------- |
| `hugo.yaml`   | baseURL、title、theme、menu、permalinks、outputFormats、security |
| `params.yaml` | 主题参数：作者、UI 样式、功能开关（暗色模式/搜索/版权等）        |
| `markup.yaml` | Goldmark 渲染（允许 unsafe HTML）、TOC、Chroma 代码高亮          |

关键配置细节：

- URL 保留原始大小写（`disablePathToLower: true`）
- 启用 CJK 支持（正确统计中文字数）
- PostCSS 通过 `build.use: "postcss"` 集成，配置位于 `postcss.config.js`
- 安全策略仅允许 `postcss`、`node` 和 `sass` 命令
- 时区 `Asia/Shanghai`，超时 `120s`

## 内容结构

- **文章**: `content/post/<slug>/index.md`（page bundle），永久链接 `/post/:slug/`
- **首页**: 固定使用 `themes/meme/layouts/partials/pages/home-posts.html` 的文章列表布局
- **Section 列表页**: `_index.md` 定义各 section 的 front matter
  - `content/post/_index.md` → 文章列表
  - `content/archives/_index.md` → 文章归档
  - `content/search/_index.md` → 搜索页
- **独立页面**: `about.md`、`ideas.md`
- **摘要分隔**: 正文中使用 `<!--more-->`
- **原型模板**: `archetypes/default.md`（含 toc、tags、categories、description 等字段）
- **新文章默认 draft: true**

## 正文渲染

主题通过 `themes/meme/layouts/_default/_markup/` 中的 render hooks 渲染正文 Markdown 链接、图片、标题和表格。

- Markdown 表格由 `render-table.html` 包裹为 `.table-container`
- 标题锚点和 `linkHeadingsToTOC` 由 `render-heading.html` 处理
- Markdown 图片和 caption 由 `render-image.html` 处理
- 正文 Markdown 外链由 `render-link.html` 处理；`utils/markdownify.html` 仅继续处理非正文片段的外链

`themes/meme/layouts/partials/utils/content.html` 只负责渲染并输出最终正文；不要重新加入跨节点 HTML 正则改写。

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

直接使用 `hugo` 命令，无需包装脚本。首次构建前需要 `npm ci`，以安装 PostCSS、Pagefind 与 Dart Sass 可执行文件。

## 搜索

由 **Pagefind** 驱动，搜索页入口 `content/search/_index.md`，导航入口在 `config/_default/hugo.yaml` 的 main menu 中配置。
构建后索引生成于 `public/pagefind/`，部署前会验证 `pagefind.js` 和 `pagefind-entry.json` 存在。
旧 Lunr/Algolia 链路已删除。

## 已移除的主题兼容项

以下原 MemE 功能不再维护配置兼容性：

- 多评论系统：Disqus、Valine、Utterances、Gitalk、Giscus、Remark42
- PWA service worker
- Adsense 与旧统计矩阵：Google Analytics、Yandex Metrika 等
- 旧文章分享矩阵、Fediverse 分享页
- 多语言切换组件和非 `zh-cn` 语言包
- 段落首字下沉、段落缩进、脚注返回图标、视频 host 等正文后处理兼容项
- 图片 host / headAlso URL 改写
- 404 海报和视频背景参数
- GitInfo、编辑链接和反馈入口组件
- 文章更新时间 SVG badge
- minimal footer / about minimal footer
- 相关文章组件
- Force HTTPS 前端跳转脚本
- `poetry`、`footage`、`page` 等非文章列表首页模式
- InstantPage 全站预加载脚本
- MathJax 公式渲染链路（公式能力保留 KaTeX）
- Medium Zoom 图片放大集成
- 原 MemE `exampleSite` / `config-examples` 参数样例

保留并重写为本站定制组件的能力：

- 不蒜子访问统计：站点 PV/UV 与文章页 PV
- 文章二维码分享：仅文章页按需加载 QR 生成库

## 主题维护原则

后续维护 `themes/meme` 时，不按“当前是否启用”直接删除功能，而按维护收益分层处理：

- **保留核心能力**：文章列表、归档、分类、标签、RSS、SEO 元信息、暗色模式、代码高亮/复制、TOC、标题锚点、Pagefind 搜索、文章导航、基础图片/表格/脚注样式。
- **停放轻量能力**：KaTeX、Mermaid、返回顶部、阅读进度、分类树、标签云、图片 caption、外链 target blank、small caps、justify、emphasis point、glyph correction 等。只要模板边界清晰且维护成本低，不因暂时未启用就删除。
- **删除兼容包袱**：多搜索引擎、多评论系统、多语言主题矩阵、广告/旧统计矩阵/PWA/分享矩阵、非文章列表首页模式、跨节点 HTML 正则后处理。未来需要时按本站需求重建，不恢复上游 MemE 的大兼容矩阵。

已删除功能如需恢复，优先做单一、明确、站点定制的组件。例如评论只选一个 provider，图片灯箱按当前 render hook 结构接入，HTTPS 强制跳转放在部署层处理。

## 重构验证清单

主题或构建链路有较大改动时，至少执行：

```bash
npm run format:check
npm run build:site -- --logLevel warn
npm run build:search
git diff --check
git -C themes/meme diff --check
```

重点抽查：

- `public/pagefind/pagefind.js` 和 `public/pagefind/pagefind-entry.json` 存在。
- Pagefind 索引页数接近文章页和明确允许索引的独立页数量，不应大量索引标签/分类/分页列表页。
- 首页、分页页不应出现 `busuanzi_container_page_pv`；该 ID 只应出现在文章详情页。
- 生成 HTML 中不应存在重复 `<script type="module">`、空社交图标链接或重复 ID。
- Markdown 表格由 render hook 包裹为 `.table-container`；代码高亮内部表格不应被该容器包裹。
- `themes/meme/layouts/partials/utils/content.html` 不应重新加入 `replaceRE`、`findRE` 或跨节点 `Scratch` 状态传递。
- 主题布局和样式不应再引用 `homeLayout`、`homePoetry`、`homePoster` 或 `pages/home-footage`、`pages/home-poetry`。

## CI/CD（GitHub Actions）

推送 `main` 分支触发（`.github/workflows/gh-pages.yml`）：

1. Checkout（含子模块）
2. 从 `.hugo-version` 读取版本，安装 Hugo Extended
3. 从 `.node-version` 读取版本，安装 Node，`npm ci`
4. Prettier 格式检查
5. Hugo 构建（`--minify --gc --logLevel warn`）
6. Pagefind 索引构建
7. 验证 Pagefind 产物
8. 上传 `public/` 为 Pages artifact 并部署

## 社交媒体

配置位于 `data/Socials.toml`，通过主题模板渲染：

- RSS、GitHub、微博、知乎

## .gitignore 要点

| 模式                | 说明          |
| ------------------- | ------------- |
| `/public/`          | Hugo 构建输出 |
| `/resources/_gen/`  | Hugo 资源缓存 |
| `node_modules/`     | npm 依赖      |
| `.vscode/` `.idea/` | IDE 配置      |
| `.env*`             | 环境变量      |
| `*.log`             | 日志文件      |

## 编辑器 / 格式化

- **Prettier**（v3）：使用 `prettier-plugin-go-template` 插件处理 Go 模板。排除范围见 `.prettierignore`。
- **EditorConfig**：统一缩进（2 空格）、UTF-8、LF 换行、文件末空行。
- **CSS 后处理**：PostCSS + autoprefixer，浏览器目标见 `package.json` 的 `browserslist`。

## 重要提示

- **主题子模块**: `themes/meme` 指向个人 fork，**不要修改其 URL**
- **依赖安装**: 首次用 `npm ci`，仅在需要更新 lock 文件时用 `npm install`
- **新建文章**: `hugo new post/<slug>` 或手动创建 `content/post/<slug>/index.md`
- **语言**: 站点固定为 `zh-cn`，翻译只保留 `themes/meme/i18n/zh-cn.toml`
- **Hugo 构建缓存**: `resources/_gen/` 被 gitignore
- **CI 构建日志**: 工作流中 Hugo 通过 `--logLevel warn` 运行，减少噪音
