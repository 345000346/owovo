---
title: "解决about等页面显示在文章列表中的问题"
date: 2019-09-05T10:57:15+08:00
tags: ["Hugo"]
categories : ["Hugo"]
toc : true
---

本文主要解决 about（关于）等页面显示在文章列表中的问题

截止到本文发布时，支持 Hugo 0.58.0 版，其他版本未测试

<!--more-->

## 找到文件

进入主题页面下，例如本博客使用的 `maupassant` 主题，进入 `maupassant\layouts` 文件夹下

打开 `index.html` 文件

```html
{{ partial "head" . }}

<body>
{{ partial "header" . }}

<div id="body">
    <div class="container">
        <div class="col-group">

            <div class="col-8" id="main">
                <div class="res-cons">
                        { range $index,$data := .Paginator.Pages }}
                        <article class="post">
                            <header>
                                <h1 class="post-title">
                                    <a href="{{ .Permalink }}" title="{{ .Title }}" >{{ .Title }}</a>
                                </h1>
                            </header>
                            <date class="post-meta meta-date">
                                {{ .Date.Year }}年{{ printf "%d" .Date.Month }}月{{ .Date.Day }}日
                            </date>
                            {{ with .Params.Categories }}
                            <div class="post-meta">
                                <span>|</span>
                                {{ range . }}
                                <span class="meta-category"><a href="{{ "/categories/" | absLangURL }}{{ . | urlize }}">{{ . }}</a></span>
                                {{ end }}
                            </div>
                            {{ end }}
                            <div class="post-content">
                                {{ .Summary }}……
                            </div>
                            <p class="readmore"><a href="{{ .Permalink }}">阅读全文</a></p>
                        </article>
                    {{ end }}
                    {{ partial "paginator" . }}
                </div>
            </div>

            {{ partial "sidebar" . }}
        </div>
    </div>
</div>
{{ partial "footer" . }}

</body>
</html>
```

将第12行 `{{ range $index,$data := .Paginator.Pages }}` 注释掉

注意注释的时候要带引号 ，即`<!-- "{ range $index,$data := .Paginator.Pages }}" -->`，否则将会报错。

然后将`{{ range $index,$data := .Paginator.Pages }}`

替换为` {{ range $index, $data := (where .Paginator.Pages "Type" "in" .Site.Params.mainSections) }}`

------

## 替换结果

下面这是替换好的文件，供参考：

```html
{{ partial "head" . }}

<body>
{{ partial "header" . }}

<div id="body">
    <div class="container">
        <div class="col-group">

            <div class="col-8" id="main">
                <div class="res-cons">
              <!-- "{ range $index,$data := .Paginator.Pages }}" -->
					{{ range $index, $data := (where .Paginator.Pages "Type" "in" .Site.Params.mainSections) }}
                        <article class="post">
                            <header>
                                <h1 class="post-title">
                                    <a href="{{ .Permalink }}" title="{{ .Title }}" >{{ .Title }}</a>
                                </h1>
                            </header>
                            <date class="post-meta meta-date">
                                {{ .Date.Year }}年{{ printf "%d" .Date.Month }}月{{ .Date.Day }}日
                            </date>
                            {{ with .Params.Categories }}
                            <div class="post-meta">
                                <span>|</span>
                                {{ range . }}
                                <span class="meta-category"><a href="{{ "/categories/" | absLangURL }}{{ . | urlize }}">{{ . }}</a></span>
                                {{ end }}
                            </div>
                            {{ end }}
                            <div class="post-content">
                                {{ .Summary }}……
                            </div>
                            <p class="readmore"><a href="{{ .Permalink }}">阅读全文</a></p>
                        </article>
                    {{ end }}
                    {{ partial "paginator" . }}
                </div>
            </div>

            {{ partial "sidebar" . }}
        </div>
    </div>
</div>
{{ partial "footer" . }}

</body>
</html>

```

------

## 参考资料

本文参考资料：https://github.com/rujews/maupassant-hugo/issues/45