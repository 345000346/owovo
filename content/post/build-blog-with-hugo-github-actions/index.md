---
title: "使用 GitHub Actions + Hugo + GitHub Pages 搭建博客"
date: 2026-03-23T00:00:00+08:00
slug: "build-blog-with-hugo-github-actions"
toc: true
tags: ["GitHub", "Hugo"]
categories: ["Hugo"]
draft: false
---

如果你想用 `Hugo` 搭一个静态博客，同时又希望把站点托管到 `GitHub Pages`，那现在最省事的做法就是：**直接在当前仓库里构建并发布。**

这篇文章只讲一套当前还适合直接照着做的流程：在博客仓库里写文章，在博客仓库里跑 `GitHub Actions`，再由 `GitHub Pages` 直接发布构建结果。

<!--more-->

## 一、准备 Hugo 项目

先确保你已经有一个能正常运行的 `Hugo` 项目。

如果你还没有项目，可以先初始化：

```text
hugo new site myblog
```

然后根据自己的习惯安装主题、补充配置、添加文章。

## 二、设置站点地址

打开 Hugo 配置文件，把 `baseURL` 改成你的正式访问地址。

例如：

```yaml
baseURL: "https://owovo.xyz"
```

如果你暂时还没有自己的域名，也可以先写成后续准备使用的 `GitHub Pages` 地址，等域名配置完成后再改。

## 三、准备构建命令

如果你的站点只需要 Hugo 本身来生成页面，那么最简单的构建脚本可以这样写：

```json
{
  "scripts": {
    "build:site": "hugo --gc --minify"
  }
}
```

如果你的项目除了生成静态页面之外，还需要额外生成搜索索引、前端资源或别的发布产物，也可以拆开写清楚。

例如：

```json
{
  "scripts": {
    "build:site": "hugo --gc --minify",
    "build:search": "pagefind --site public",
    "build": "npm run build:site && npm run build:search"
  }
}
```

核心思路很简单：把你本地发布时真正要跑的命令，整理成仓库里的脚本，后面工作流直接调用它。

## 四、编写 GitHub Pages 工作流

在仓库里新建文件：

```text
.github/workflows/gh-pages.yml
```

可以直接使用下面这份工作流：

```yaml
name: GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: github-pages
  cancel-in-progress: true

env:
  HUGO_VERSION: "0.161.1"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: true
          fetch-depth: 0

      - name: Configure Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: ${{ env.HUGO_VERSION }}
          extended: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build:site

      - name: Build search
        run: npm run build:search

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

如果你的项目不需要 `Node.js`、也不需要额外生成搜索索引，可以把下面这些步骤删掉：

- `Setup Node.js`
- `Install dependencies`
- `Build search`

然后把工作流里的构建命令改成只执行 Hugo 构建即可。

## 五、开启 Pages 发布

工作流写好之后，进入仓库设置：

```text
Settings -> Pages
```

在发布来源里选择：

```text
GitHub Actions
```

这样这个仓库就会使用你刚刚写好的工作流来发布站点。

## 六、推送代码并自动发布

把博客代码推送到 `main` 分支后，`GitHub Actions` 就会自动开始执行。

整个过程一般分成两步：

- 先构建站点
- 再部署到 `GitHub Pages`

你可以在仓库的 `Actions` 页面查看每一次发布记录。

## 七、绑定自定义域名

如果你希望博客通过自己的域名访问，比如 `owovo.xyz`，还需要再做两件事。

### 1. 在 Pages 设置里填写域名

进入：

```text
Settings -> Pages
```

把你的正式域名填到 `Custom domain` 里并保存。

保存后，等 GitHub 证书准备完成，再打开 `Enforce HTTPS`。

### 2. 在域名服务商后台添加解析

这一部分要看你使用的是哪一家域名服务商，但原则很简单：

- 根域名解析到 `GitHub Pages`
- `www` 子域名通常可以添加一条 `CNAME` 指向 `用户名.github.io`

如果你已经换成自己的正式域名，别忘了把 Hugo 配置里的 `baseURL` 也同步改成这个域名。

## 八、适合长期维护的做法

如果你准备长期维护这个博客，建议把下面几件事固定下来：

1. 内容、主题、配置和工作流都放在同一个仓库里维护。
2. 本地构建命令和工作流构建命令保持一致。
3. 每次改域名、改资源路径、改搜索方案时，同时检查 `baseURL` 和发布流程。
4. 站点能正常发布后，再去处理自定义域名和 HTTPS。

按这套方式整理后，博客的日常维护会简单很多，发布链路也更直观。
