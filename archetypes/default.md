---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
slug: "{{ .File.ContentBaseName }}"
draft: true
toc: true
tags: []
categories: []
description: ""
# 将本地图片放在本文章目录，再以 ![说明](image.jpg) 引用；Hugo 会自动生成响应式 WebP。
# source: "https://example.com/original"  # 转载时填写原文 URL
outdated: false
---
