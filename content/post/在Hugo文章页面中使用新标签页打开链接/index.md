---
title: "在 Hugo 文章页面中使用新标签页打开链接"
date: 2019-09-05T12:55:49+08:00
tags: ["Hugo"]
categories: ["Hugo"]
toc: true
---

`Hugo` 使用 `Markdown` 格式来编写文章，但是在 `Markdown` 中没有编写新标签页打开网址链接的方法，造成了诸多不便

本文将解决这个问题

<!--more-->

## 主要思路

使用 `JavaScript` 给 `HTML` 代码中的 `<a>` 标签批量添加 `tartget = "_blank"`

## 方法

给文章正文的 `<div>` 添加 id

如
```html
<div class="post-content" id="post-content-id">
   {{ .Content }}
</div>
```

### 编写 JavaScript 代码

```javascript
//给 <a> 标签批量加上 tartget = "_blank"
<script type="text/javascript">
	function addaTarget(id) {
		var aTags = document.getElementById(id).getElementsByTagName("a");
		for (i = 0; i < aTags.length; i++) {
		var aTags_item = aTags[i];
		aTags_item.target = "_blank";
    }
}
</script>
```

将 JavaScript 代码放在 `<body>`之前

### 引用 function

在文章正文`</div>`之后添加 

```javascript
//给 <a> 标签批量加上 tartget = "_blank"
<script type="text/javascript">
	addaTarget("post-content-id");
</script>
```

**当然也可以将此 JavaScript 代码单独编写，在页面中引用。**