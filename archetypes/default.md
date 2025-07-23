---
# 文章标题，自动将文件名中的连字符转换为空格，并首字母大写
title: "{{ replace .Name "-" " " | title }}"
# 文章创建日期
date: {{ .Date }}
# 是否为草稿，true 表示是草稿，不会发布
draft: true
---

