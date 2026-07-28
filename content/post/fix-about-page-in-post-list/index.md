---
title: "解决 about 等自定义页面显示在文章列表中的问题"
date: 2019-09-05T10:57:15+08:00
lastmod: 2026-05-18T00:00:00+08:00
slug: "fix-about-page-in-post-list"
description: "about.md 等自定义页面意外出现在首页文章列表中？本文分析 .Site.RegularPages 遍历的原因，并给出 Hugo + MemE 主题的解决方案。"
tags: ["Hugo", "自定义页面"]
toc: true
---

Hugo 中 `about.md`、`search.md` 等自定义页面有时会意外出现在首页文章列表中。本文说明问题原因及解决方案。

本文基于 Hugo 0.161.1 + MemE 主题编写，其他主题同理。

<!--more-->

## 问题原因

Hugo 的 `.Site.RegularPages` 返回**所有**普通页面，包括 `content/about.md` 这类独立页面。如果主题在首页直接用 `.Site.RegularPages` 遍历输出，这些页面就会被列出来。

## 解决方案：使用 mainSections 过滤

Hugo 提供了 `mainSections` 参数来指定哪些 section 属于"文章"。在 `config/_default/params.yaml`（或 `config.toml`）中配置：

```yaml
mainSections:
  - post
```

然后在模板中将：

```go
{{ range .Site.RegularPages }}
```

替换为：

```go
{{ range where .Site.RegularPages "Section" "in" .Site.Params.mainSections }}
```

这样只有 `content/post/` 下的文章会出现在列表中，`about.md`、`search.md` 等独立页面不再混入。

## MemE 主题已内置

当前使用的 MemE 主题在 `layouts/partials/pages/home-posts.html` 中已经做了这个过滤：

```go
{{ $pages := where .Site.RegularPages "Section" "in" .Site.Params.mainSections }}
```

所以只需确保 `config/_default/params.yaml` 中配置了正确的 `mainSections` 即可，无需修改主题模板。

## 参考资料

- [Hugo 文档：mainSections](https://gohugo.io/functions/where/)
- 本文原始版本（2019 年）针对 Hugo 0.58.0 + maupassant 主题编写，上述方案为当前推荐做法。
