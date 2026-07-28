---
title: "批量去除文件名中的空格、批量重命名"
date: 2019-10-10T08:41:03+08:00
slug: "batch-remove-spaces-rename-files"
description: "用 .bat 批处理脚本批量去除文件名中的空格、批量重命名文件，两步搞定，简单实用。"
tags: ["Windows", "批处理", "脚本"]
---

本次介绍一下批量去除文件名中的空格、批量重命名的方法。

<!--more-->

## 一、批量去除文件名中的空格

把以下代码保存成.bat 批处理文件，放到需要批量重命名的文件内，运行即可。



```c
@echo off&setlocal enabledelayedexpansion
for /f "delims=" %%i in ('dir /s/b *.*') do (
    set "foo=%%~nxi"
    set foo=!foo: =!
    set foo=!foo: =!
    ren "%%~fi" "!foo!"
)
exit
```



## 二、批量重命名

单个用 ren 命令，多个分行放到一个文本文档里，如：



```c
ren	demaxiya(01).jpg	demaxiya01.jpg
ren	demaxiya(02).jpg	demaxiya02.jpg
ren	demaxiya(03).jpg	demaxiya03.jpg
```

保存在文件所在文件夹里，改为.bat 后缀，运行即可。

那么，问题来了，如果需重命名的文件较多，如何把众多文件名及新文件名放到文本文档里呢？一个个复制岂不累死？不用，看方法：

运行 CMD 调出 DOS 窗口，先用 “CD C:\XXX"定位到文件所在文件夹 XXX，再输入命令 “dir /b>rename.xls"，就会在 XXX 文件夹里生成一个 rename.xls 文档，里面列出了该文件夹中的所有文件名。然后，在其前面插入一列用 ren 填充，后面一列一一对应输入新文件名（可以用自动填充），最后这三列复制粘贴到文本文档里，就可以了。

## 三、提取全部文件名

把以下代码保存成.bat 批处理文件，放到需要批量重命名的文件内，运行即可。

```c
DIR *.*   /B >LIST.TXT
```