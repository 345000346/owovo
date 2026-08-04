---
title: "解决 about 等自定义页面显示在文章列表中的问题"
date: 2019-09-05T10:57:15+08:00
slug: "fix-about-page-in-post-list"
description: "Hugo 的普通页为什么会混入文章列表？本文说明 .Site.RegularPages 的范围，并给出按 section 明确筛选文章的模板写法。"
tags: ["Hugo", "自定义页面"]
---

Hugo 中 `about.md`、`ideas.md` 等自定义页面有时会意外出现在首页文章列表中。本文保留这个问题的历史记录，并说明当前项目采用的筛选方式。

<!--more-->

## 问题原因

Hugo 的 `.Site.RegularPages` 返回**所有**普通页面，包括 `content/about.md` 这类独立页面。如果模板直接遍历它们，独立页面自然会被当成文章输出。

## 按文章 section 筛选

文章统一放在 `content/post/` 下时，可以在模板中明确筛选 `Section`：

```go
{{ $pages := where .Site.RegularPages "Section" "eq" "post" }}
{{ range $pages }}
    {{ .Title }}
{{ end }}
```

首页摘要列表和 `/archives/` 归档都使用这条规则，因此 `about.md`、`ideas.md` 等普通页不会混入文章集合。

如果使用其他主题，也应先确认主题的文章模型和 `mainSections` 约定，再把筛选规则放进主题对应的列表模板；不要直接复制某个主题的文件路径。

## 结论

`.Site.RegularPages` 是页面全集，不是文章集合。文章列表应建立在明确的 section、类型或其它稳定内容模型之上，这比依赖页面文件名或主题默认行为更可靠。

参考：[Hugo `where` 函数](https://gohugo.io/functions/where/)。
