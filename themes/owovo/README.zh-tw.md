# owovo MemE fork

這裡是 `owovo` 站點專用的 Hugo 主題 fork，來源於 MemE，但不再追求相容上游 MemE 的完整設定矩陣。

維護時以倉庫根目錄中的這些檔案為準：

- `AGENT.md`
- `REFACTOR_PLAN.md`
- `config/_default/`

## 保留能力

- Hugo 文章列表首頁
- 歸檔、分類、標籤和 RSS
- Pagefind 搜尋
- 暗色模式
- SEO 中繼資料、Open Graph、Twitter Cards 和 JSON-LD
- 程式碼高亮和複製按鈕
- TOC、標題錨點和文章導航
- Markdown 連結、圖片、標題、表格 render hooks
- KaTeX、Mermaid 等輕量可選整合

## 已移除的上游相容項

- Lunr 和 Algolia 搜尋
- 多評論 provider 矩陣
- PWA service worker
- Adsense 和舊統計腳本
- 文章分享元件和 Fediverse 分享頁
- 多語言切換器和非 `zh-cn` 語言包
- `poetry`、`footage`、`page` 首頁模式
- 首字下沉、段落縮排、影片 host、腳註圖示等 HTML 後處理
- 圖片 host 和 headAlso URL 改寫
- 404 海報和影片背景參數
- GitInfo、編輯連結和回饋入口元件
- 文章更新時間 SVG badge
- minimal footer 和 about minimal footer
- 相關文章元件
- Force HTTPS 前端跳轉腳本
- InstantPage 全站預載腳本
- MathJax 渲染鏈路
- Medium Zoom 圖片放大整合
- 上游示例設定

未來新增功能應按本站需求重新實作，不應直接恢復上游的大相容矩陣。
