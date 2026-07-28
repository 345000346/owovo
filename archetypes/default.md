---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
slug: "{{ .File.ContentBaseName }}"
description: ""
tags: []
draft: true
# 文章 TOC 默认开启，勿写 toc: true；关闭时取消下一行注释：
# toc: false
# 将本地图片放在本文章目录，再以 ![说明](image.jpg) 引用；Hugo 会自动生成响应式 WebP。
# source: "https://example.com/original"  # 转载时填写原文 URL
# author: "原文作者"
# outdated: true
# outdatedNote: "归档说明"
---
