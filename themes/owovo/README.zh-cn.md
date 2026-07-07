# owovo MemE fork

这里是 `owovo` 站点专用的 Hugo 主题 fork，来源于 MemE，但不再追求兼容上游 MemE 的完整配置矩阵。

维护时以仓库根目录中的这些文件为准：

- `CLAUDE.md`
- `config/_default/`

## 保留能力

- Hugo 文章列表首页
- 归档、分类、标签和 RSS
- Pagefind 搜索
- 暗色模式
- SEO 元信息、Open Graph、Twitter Cards 和 JSON-LD
- 代码高亮和复制按钮
- TOC、标题锚点和文章导航
- Markdown 链接、图片、标题、表格 render hooks
- KaTeX、Mermaid 等轻量可选集成

## 已移除的上游兼容项

- Lunr 和 Algolia 搜索
- 多评论 provider 矩阵
- PWA service worker
- Adsense 和旧统计脚本
- 文章分享组件和 Fediverse 分享页
- 多语言切换器和非 `zh-cn` 语言包
- `poetry`、`footage`、`page` 首页模式
- 首字下沉、段落缩进、视频 host、脚注图标等 HTML 后处理
- 图片 host 和 headAlso URL 改写
- 404 海报和视频背景参数
- GitInfo、编辑链接和反馈入口组件
- 文章更新时间 SVG badge
- minimal footer 和 about minimal footer
- 相关文章组件
- Force HTTPS 前端跳转脚本
- InstantPage 全站预加载脚本
- MathJax 渲染链路
- Medium Zoom 图片放大集成
- 上游示例配置
- Atom feed
- 主题发布元数据、上游资助配置和多语言 README
- 主题内默认社交链接和重复 favicon / manifest 静态资源

未来新增功能应按本站需求重新实现，不应直接恢复上游的大兼容矩阵。
