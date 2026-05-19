---
title: "使用 GitHub Actions + Hugo + GitHub Pages 搭建博客"
date: 2026-03-23T00:00:00+08:00
slug: "build-blog-with-hugo-github-actions"
description: "在当前仓库里写文章、跑 GitHub Actions 自动构建、由 GitHub Pages 直接发布。一套 2026 年还适用的 Hugo 博客部署流程。"
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

> **提示：** 如果你使用了 `Dart Sass` 等需要特殊运行环境的工具，Hugo 在构建时可能找不到正确的 `sass` 二进制文件。这种情况下可以写一个简单的 Node.js 封装脚本，在调用 `hugo` 前把本地工具目录注入 `PATH`，然后在 `package.json` 中通过封装脚本来执行构建：
>
> ```json
> {
>   "scripts": {
>     "build:site": "node ./scripts/run-hugo.mjs --gc --minify"
>   }
> }
> ```
>
> 这样无论是本地开发还是 CI 环境，Hugo 调用的都是同一套工具链，不会出现环境不一致的问题。

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

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          submodules: true
          fetch-depth: 0

      - name: Read Hugo version
        id: hugo-version
        run: echo "version=$(cat .hugo-version)" >> $GITHUB_OUTPUT

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: ${{ steps.hugo-version.outputs.version }}
          extended: true

      - name: Setup Hugo resource cache
        uses: actions/cache@v5
        with:
          path: ./resources/_gen
          key: ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-${{ hashFiles('package-lock.json', '.gitmodules', 'config/_default/**/*.yaml') }}
          restore-keys: |
            ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-
            ${{ runner.os }}-hugo-

      - name: Read Node.js version
        id: node-version
        run: echo "version=$(cat .node-version)" >> $GITHUB_OUTPUT

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: ${{ steps.node-version.outputs.version }}
          cache: "npm"
          cache-dependency-path: package-lock.json

      - name: Install root dependencies
        run: npm ci

      - name: Check format
        run: npm run format:check

      - name: Build site
        run: npm run build:site

      - name: Build search
        run: npm run build:search

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
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
        uses: actions/deploy-pages@v5
```

### 这份工作流在做什么

上面这份配置包含了几个值得留意的地方：

**1. Hugo 版本集中管理**

把 Hugo 版本号写在一个单独的文件 `.hugo-version` 里：

```text
0.161.1
```

工作流通过 `Read Hugo version` 步骤读取这个文件，再传给 `peaceiris/actions-hugo`。这样以后升级 Hugo 只需要改这一个文件，不用去翻工作流配置。

如果你使用 `renovate` 之类的自动更新工具，它也可以直接识别 `.hugo-version` 并自动提 PR。

**2. Hugo 构建缓存**

```yaml
      - name: Setup Hugo resource cache
        uses: actions/cache@v5
        with:
          path: ./resources/_gen
          key: ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-${{ hashFiles('package-lock.json', '.gitmodules', 'config/_default/**/*.yaml') }}
          restore-keys: |
            ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-
            ${{ runner.os }}-hugo-
```

Hugo 在处理 SCSS 等前端资源时，会在 `resources/_gen` 目录下生成缓存文件。加上缓存步骤后，后续构建可以直接复用这些中间产物，避免重复编译。

缓存的 key 里包含了 Hugo 版本、`package-lock.json` 和配置文件目录的哈希值——当这些依赖发生变化时，旧缓存会自动失效，不会引入不一致的问题。

**3. 使用 npm 脚本作为统一入口**

构建步骤中调用的 `npm run build:site` 和 `npm run build:search` 都是在 `package.json` 里事先定义好的脚本。这样做的好处是：本地开发和 CI 跑的是完全相同的命令，不会出现"本地能过、CI 报错"的情况。

### 按需裁剪

如果你的项目不需要 `Node.js`、也不需要额外生成搜索索引，可以把下面这些步骤删掉：

- `Setup Hugo resource cache`
- `Setup Node.js`
- `Install dependencies`
- `Build search`

然后把工作流里的构建命令改成只执行 Hugo 构建即可。Hugo 版本仍然建议通过 `.hugo-version` 管理，而不是直接写在 `env` 里。

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
2. 把 Hugo 版本号放在 `.hugo-version` 文件里单独管理，工作流从文件读取而不是硬编码。升级 Hugo 时只需要改这一个地方。
3. 本地构建命令和工作流构建命令保持一致，都通过 `package.json` 里的 `npm` 脚本调用。
4. 为 Hugo 配置构建缓存（`actions/cache`），能让每次 CI 构建快不少；缓存 key 里记得带上 Hugo 版本号，升级时旧缓存会自动失效。
5. 每次改域名、改资源路径、改搜索方案时，同时检查 `baseURL` 和发布流程。
6. 站点能正常发布后，再去处理自定义域名和 HTTPS。

按这套方式整理后，博客的日常维护会简单很多，发布链路也更直观。
