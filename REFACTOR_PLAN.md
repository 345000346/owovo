# owovo 主题重构计划

## Summary

本仓库后续把 `themes/meme` 作为 owovo 专用主题维护，不再追求兼容原 MemE 的完整参数矩阵。当前已保留 submodule 结构并直接修改 fork 内代码，恢复 CI 与线上行为，移除旧 Lunr/Algolia 搜索运行链路，删除本站未使用的评论、PWA、Adsense、Google/Yandex 统计、分享矩阵、多语言切换、非文章列表首页模式、段落首字下沉、段落缩进、脚注返回图标和视频 host 兼容层，并将正文链接、图片、标题、表格渲染迁移到 Hugo render hooks。不蒜子统计和文章二维码分享已按本站需求以小组件形式回补。

## Key Changes

- 先恢复可构建状态：格式化 `AGENT.md`，补齐分类元信息配置，修复 `head.html` 中重复的 Pagefind 高亮脚本，补齐或兜底缺失社交图标。
- 收敛搜索索引：Pagefind 只索引文章正文和必要独立页，列表页、标签页、分类页、归档页、分页页、搜索页不参与索引。
- 把 fork 改成站点专用主题：旧 Lunr/Algolia 搜索链路、多评论系统、PWA service worker、Adsense、Google/Yandex 统计、旧文章分享矩阵、多语言切换资源和原 MemE 示例配置已删除；主题不再兼容这些原 MemE 参数。
- 回补明确需要的轻量功能：不蒜子作为唯一访问统计入口；二维码分享作为文章页定制组件，按需加载 QR 生成库，不恢复旧社交分享 provider 矩阵。
- 替换脆弱 HTML 正则加工：正文链接、图片、标题锚点、标题 TOC 链接和 Markdown 表格容器已迁移到 Hugo render hooks；`utils/content.html` 现在只负责调用 `custom/content.html` 并输出最终正文，不再做跨节点 HTML 正则改写。
- 收敛配置接口：减少隐式必填字段，缺失图标和关键配置要么有明确默认值，要么构建时报错；修正中文站点语言配置，同时保持 URL、RSS、文章永久链接不变。
- 删除死配置：`favicon`、`pagefindSearchPath` 和旧 `cc` 参数不再暴露；图标路径固定在 head 模板中，搜索入口由 Hugo menu 控制，版权声明使用站点级 `copyright`。
- 固定首页布局：删除 `homeLayout` 参数以及 `poetry`、`footage`、`page` 首页分支，首页始终渲染文章列表。

## Pruning Policy

后续不按“当前是否启用”直接删除功能，而按维护收益分层处理：

- **保留核心能力**：文章列表、归档、分类、标签、RSS、SEO 元信息、暗色模式、代码高亮/复制、TOC、标题锚点、Pagefind 搜索、文章导航、基础图片/表格/脚注样式。这些属于博客长期能力，即使暂时少用也不应随手删除。
- **停放可选能力**：数学公式、Mermaid、Medium Zoom、相关文章、更新徽章、Git 信息、返回顶部等。若模板和依赖轻量、边界清晰，可以继续保留开关；只有在确认长期不用且维护成本明显时再删。
- **删除兼容包袱**：多搜索引擎、多评论系统、多语言主题矩阵、广告/旧统计矩阵/PWA/分享矩阵、非文章列表首页模式、跨节点 HTML 正则后处理。这些不是当前站点核心能力，且带来较高维护成本；未来需要时应按本站需求重新实现，而不是保留原 MemE 的大兼容矩阵。

## Removed Feature Review

| 已删除功能                                             | 删除原因                                                                                      | 未来需要时的建议                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Lunr / Algolia 搜索                                    | 已统一为 Pagefind，旧索引模板、JS 和搜索框会增加构建面与行为分叉                              | 继续扩展 Pagefind；除非 Pagefind 不能满足需求，否则不恢复多搜索引擎   |
| 多评论系统                                             | Disqus、Valine、Utterances、Gitalk、Giscus、Remark42 同时维护成本高，且当前站点没有评论入口   | 按单一评论方案重新接入，不恢复多 provider 矩阵                        |
| PWA service worker                                     | 当前是静态博客，不需要离线缓存与更新通知；旧 service worker 容易造成缓存疑难问题              | 如需 PWA，按当前构建产物重新设计缓存策略                              |
| Adsense / Google Analytics / Yandex Metrika            | 广告和多套统计 provider 不是当前站点核心能力，且涉及外部脚本、隐私和加载性能                  | 不恢复多 provider 矩阵；当前只保留不蒜子作为明确统计入口              |
| 旧文章分享矩阵、Fediverse 分享页                       | 与当前阅读路径关系弱，模板和脚本较分散                                                        | 不恢复多 provider 分享矩阵；当前只保留文章二维码分享                  |
| 多语言主题矩阵                                         | 站点固定 `zh-cn`，保留多语言包和切换器会放大维护面                                            | 如需多语言，先设计内容结构，再恢复语言切换                            |
| 非文章列表首页模式                                     | 本站首页固定为文章列表；`poetry`、`footage`、`page` 分支依赖大量专用参数和样式                | 若要新首页，按本站信息架构新建，不恢复旧 MemE 首页模式                |
| 段落首字下沉、段落缩进、脚注返回图标、视频 host 后处理 | 依赖跨节点 HTML 正则，和 Hugo render hooks、Goldmark 输出强耦合                               | 用 Markdown render hooks、shortcode 或明确组件重建                    |
| 图片 host / headAlso URL 改写                          | 当前站点没有图片 CDN 配置；保留该分支会让 Markdown 图片和 SEO 图片路径多一层环境相关行为      | 如需图片 CDN，优先用 Hugo 资源管线或部署层 CDN，而不是模板字符串改写  |
| 404 海报和视频背景                                     | 当前站点没有 404 背景资产；旧分支会生成空 `url()` 背景并增加视觉资源配置面                    | 若要品牌化 404，按本站视觉重新设计，不恢复旧资产参数                  |
| GitInfo / 编辑 / 反馈组件                              | 依赖 Hugo GitInfo、repo URL、编辑 URL、图标和多组参数；当前站点没有启用，也不是读者侧核心能力 | 若要“编辑此页”或反馈入口，按 GitHub 仓库结构单独设计                  |
| 文章更新时间 SVG badge                                 | 依赖 `lastmod` 维护质量，且与普通 modified date 元信息能力重叠                                | 如需展示更新时间，优先启用文章元信息中的 modified date                |
| minimal footer / about minimal footer                  | 与全站主 footer、文章标签组件和关于页内容职责重叠，且当前没有启用                             | 保留主 footer；如需页面专属页脚，按具体页面重新设计                   |
| 相关文章组件                                           | 当前没有启用 Hugo related 配置；与标签、分类和文章导航的内容发现职责重叠                      | 保留标签、分类、文章导航；如需推荐阅读，按本站内容结构重新设计        |
| Force HTTPS 前端跳转脚本                               | `baseURL` 已是 HTTPS，HTTPS 应由 GitHub Pages/CDN/域名配置保证；前端跳转脚本属于部署层兜底    | 如需强制 HTTPS，在部署层配置重定向                                    |
| InstantPage 预加载                                     | 收益不确定，且额外引入第三方脚本；当前站点没有明确的性能策略需要它                            | 如需预加载，结合实际访问路径重新设计                                  |
| MathJax 公式渲染                                       | 与 KaTeX 功能重叠，且额外引入较大的第三方脚本和独立配置分支                                   | 默认使用 KaTeX；若未来确需 MathJax 的特性，再单独评估接入             |
| Medium Zoom 图片放大                                   | 当前没有启用，且额外引入第三方脚本；图片基础展示和 caption 已由 render hook 覆盖              | 如需图片灯箱，按当前图片结构重新接入                                  |
| 上游示例配置和上游 README 内容                         | 已不再代表本站 fork 的真实能力，继续保留会误导维护                                            | 以本仓库的 `AGENT.md`、`REFACTOR_PLAN.md`、主题 README 和实际配置为准 |

## Deferred Feature Inventory

这些能力当前可能未在 `params.yaml` 中显式配置，但不按死代码处理：

| 能力                                                  | 当前处理                                 | 保留理由                                 |
| ----------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| KaTeX / Mermaid                                       | 默认关闭，按文章 front matter 或参数开启 | 写技术文章时可能需要，模板边界清晰       |
| 不蒜子统计                                            | 默认开启，可通过参数关闭                 | 站点希望保留访问计数，单一入口维护成本低 |
| 文章二维码分享                                        | 默认开启，仅文章页按需加载 QR 库         | 分享入口明确，且不恢复旧社交分享矩阵     |
| 文章导航                                              | 默认关闭或未显式配置，保留组件           | 属于博客内容组织和维护信息，未来价值明确 |
| 返回顶部、阅读进度                                    | 默认关闭或已有默认值，保留组件           | UI 增强，维护成本低                      |
| 分类树、标签云、列表分组                              | 保留 taxonomy/list 模板                  | 分类和标签是核心信息架构的一部分         |
| 图片 caption、外链 target blank                       | 保留 render hook 能力                    | 已迁移到结构化渲染点，避免回退到正文正则 |
| small caps、justify、emphasis point、glyph correction | 默认关闭，保留样式入口                   | 排版增强，代码孤立，未来启用成本低       |

## Test Plan

- `npm run format:check`
- `npm run build:site -- --logLevel warn`
- `npm run build:search`
- 验证 `public/pagefind/pagefind.js` 和 `public/pagefind/pagefind-entry.json` 存在。
- 抽查首页、文章页、归档页、标签页、搜索页、关于页、`/love.html`。
- Pagefind 索引页数应接近文章页和明确允许索引的独立页数量，不应继续索引大量标签/分类列表页。
- 生成 HTML 中不应存在重复 `<script type="module">` 和空社交图标链接。
- 主题源码中不应再出现旧 Lunr/Algolia、评论系统、PWA service worker、Adsense、Google/Yandex 统计、旧分享矩阵和多语言切换入口；不蒜子与二维码分享只应存在于当前定制组件中。
- Markdown 表格应由 render hook 包裹为 `.table-container`；代码高亮内部表格不应被该容器包裹。
- `utils/content.html` 不应再包含 `replaceRE`、`findRE` 或 `Scratch` 状态传递。
- 主题布局和样式中不应再引用 `homeLayout`、`homePoetry`、`homePoster` 或 `pages/home-footage`、`pages/home-poetry`。

## Assumptions

- 第一阶段保留 `themes/meme` submodule，不取消子模块结构。
- `static/love.html` 是独立静态页面，不纳入博客主题重构范围。
- 重构优先级为：先恢复 CI，再修搜索与 HTML 结构，最后瘦身主题和配置接口。
