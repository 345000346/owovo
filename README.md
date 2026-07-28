# LIGT'S BLOG (owovo)

个人博客站点，基于 [Hugo](https://gohugo.io/) 构建，由 GitHub Pages 托管，生产域名为 [owovo.xyz](https://owovo.xyz)。

## 环境要求

- **Node.js**：见 `.node-version`（`>=24.18.0`），请用 `npm ci` 安装依赖
- **Hugo Extended**：版本见 `.hugo-version`（当前 `0.164.0`，必须为 **extended** 以编译 Dart Sass）

```bash
# 示例：用官方安装方式或包管理器安装对应 extended 版本后
hugo version   # 应含 extended
node -v        # 应满足 .node-version
```

## 常用命令

```bash
npm ci                 # 首次 / CI：按 lock 安装，勿用 npm install 漂移依赖
npm run dev            # 本地开发（含草稿，先同步字体）
npm run build          # 生产构建：站点 + Pagefind 搜索 + smoke 校验
npm run build:site     # 仅 Hugo（--environment production；先 sync 字体）
npm run build:search   # 仅 Pagefind 索引
npm run smoke          # 对 public/ 做构建后断言（需先 build）
npm run sync:fonts:stats  # 字体分片命中统计（体积排查）
npm run preview        # 构建后启动 Pagefind 预览
npm run format         # Prettier 格式化
npm run format:check   # 格式检查（CI 会跑）
```

涉及样式 / 模板时，建议本地用 `npm run dev` 检查：首页、文章、归档、搜索、关于。  
模板变更也可用：

```bash
npm run build:site -- --panicOnWarning --logLevel warn
```

## 写文章

- 路径：`content/post/<slug>/index.md`
- 模板参考：`archetypes/default.md`
- slug 建议全小写 kebab-case
- 站内文章列表入口为 **`/archives/`**（菜单「文章」）；`/post/` 仅重定向，不是第二套列表
- 转载填 `source: <https url>`；过时文可设 `outdated: true` 与 `outdatedNote`
- 本地图片放在文章目录内引用，Hugo 会生成响应式 WebP

更完整的内容模型、模板约定与已知技术选择见 **[AGENTS.md](./AGENTS.md)**。

## 部署与 CDN

- CI：`.github/workflows/gh-pages.yml`（`main` 推送构建并部署 GitHub Pages；PR 只构建）
- 自定义域：`static/CNAME` + `config/_default/hugo.yaml` 中 `baseURL`
- 无备案时用 Cloudflare 代理 Pages：见 **[docs/cloudflare.md](./docs/cloudflare.md)**  
  一键：`CLOUDFLARE_API_TOKEN` + `GITHUB_PAGES_HOST` 后 `npm run cf:setup`

## 许可证

| 范围                                       | 许可                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 本仓库**代码**（模板、样式、脚本、配置等） | [MIT](https://opensource.org/licenses/MIT)（见 `package.json`）                                    |
| **文章与原创文案**等内容                   | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh)（页脚与文章版权信息） |

第三方字体（Fontsource 等）与依赖包遵循其各自许可证。
