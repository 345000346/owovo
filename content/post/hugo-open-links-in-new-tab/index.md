---
title: "在 Hugo 文章页面中使用新标签页打开外部链接"
date: 2019-09-05T12:55:49+08:00
lastmod: 2026-05-18T00:00:00+08:00
slug: "hugo-open-links-in-new-tab"
description: "Markdown 语法本身不支持指定链接打开方式。本文介绍如何用 Hugo 的 render hook 让外部链接自动在新标签页打开，无需 JavaScript。"
tags: ["Hugo", "Markdown", "Render Hook"]
toc: true
---

Hugo 使用 Markdown 编写文章，Markdown 语法本身不支持指定链接打开方式。本文介绍如何使用 Hugo 的 **render hook** 让外部链接自动在新标签页打开，无需 JavaScript。

本文基于 Hugo 0.161.1，Hugo 0.62.0 及以上版本均可使用此方案。

<!--more-->

## Render Hook 方案

Hugo 支持为 Markdown 元素自定义渲染模板。在站点根目录的 `layouts/` 下创建链接的 render hook，即可控制所有 Markdown 链接的 `target` 属性。

创建 `layouts/_default/_markup/render-link.html`：

```html
<a href="{{ .Destination | safeURL }}"
  {{ with .Title }} title="{{ . }}"{{ end }}
  {{ if strings.HasPrefix .Destination "http" }}
    target="_blank" rel="noopener noreferrer"
  {{ end }}>
  {{ .Text | safeHTML }}
</a>
```

这段模板的逻辑：
- 所有链接正常渲染 `href` 和 `title`
- 当 `Destination` 以 `http` 开头时（即外部链接），自动加上 `target="_blank"` 和 `rel="noopener noreferrer"`
- 内部链接和锚点链接不受影响

`rel="noopener noreferrer"` 是安全最佳实践，防止新页面通过 `window.opener` 访问原页面。

## 扩展：对外部链接添加图标指示

如果想给外部链接加一个小图标提示用户会跳转，可以在 render hook 中追加样式：

```html
<a href="{{ .Destination | safeURL }}"
  {{ with .Title }} title="{{ . }}"{{ end }}
  {{ if strings.HasPrefix .Destination "http" }}
    target="_blank" rel="noopener noreferrer" class="external-link"
  {{ end }}>
  {{ .Text | safeHTML }}
</a>
```

配合 CSS：

```css
a.external-link::after {
  content: " ↗";
  font-size: 0.8em;
  opacity: 0.6;
}
```

## 为什么不用 JavaScript？

旧方案通过 JavaScript 遍历 DOM 给 `<a>` 标签批量添加 `target="_blank"`，缺点明显：

- 页面加载后才能执行，用户可能已经点击了链接
- 依赖 JavaScript，禁用 JS 时失效
- 性能开销随链接数量增长

Render hook 在 Hugo 构建时直接生成目标 HTML，无运行时开销。

---

> **本文最初于 2019 年发布，使用的是 JavaScript 方案。当前版本更新为 Hugo render hook 最佳实践。**
