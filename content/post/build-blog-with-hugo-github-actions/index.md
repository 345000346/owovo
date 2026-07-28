---
title: "使用 GitHub Actions + Hugo + GitHub Pages 搭建博客"
date: 2026-03-23T00:00:00+08:00
slug: "build-blog-with-hugo-github-actions"
description: "在当前仓库里写文章、跑 GitHub Actions 自动构建、由 GitHub Pages 直接发布。一套 2026 年还适用的 Hugo 博客部署流程。"
tags: ["GitHub", "Hugo", "GitHub Actions", "GitHub Pages"]
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

可以直接使用下面这份工作流（示例用 major 标签；生产仓库建议 pin 到 commit SHA，并由 Dependabot 自动升级）：

```yaml
name: GitHub Pages

on:
  pull_request:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Read Hugo version
        id: hugo-version
        run: echo "version=$(cat .hugo-version)" >> $GITHUB_OUTPUT

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: ${{ steps.hugo-version.outputs.version }}
          extended: true

      - name: Setup Hugo resource cache
        uses: actions/cache@v6
        with:
          path: resources/_gen
          key: ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-${{ hashFiles('package-lock.json', 'assets/**', 'config/**', 'layouts/**', 'data/**') }}
          restore-keys: |
            ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version-file: ".node-version"
          cache: "npm"
          cache-dependency-path: package-lock.json

      - name: Install root dependencies
        run: npm ci

      - name: Check format
        run: npm run format:check

      - name: Build site
        run: npm run build:site -- --panicOnWarning --logLevel warn

      - name: Build search
        run: npm run build:search

      - name: Verify Pagefind artifacts
        run: test -f public/pagefind/pagefind.js && test -f public/pagefind/pagefind-entry.json

      - name: Upload Pages artifact
        if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v5
        with:
          path: ./public

  deploy:
    if: github.event_name != 'pull_request'
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

> **说明：** 本仓库的真实工作流以 `.github/workflows/gh-pages.yml` 为准；下面解释的是同一套设计。

### 这份工作流在做什么

上面这份配置包含了几个值得留意的地方：

**1. 权限最小化**

工作流顶层只声明 `contents: read`。`build` 不额外要权限：上传 Pages artifact、读写 `actions/cache` 在默认 `GITHUB_TOKEN` 下即可完成。只有真正发布的 `deploy` 才声明：

```yaml
permissions:
  contents: read    # 顶层基线：检出代码

jobs:
  deploy:
    permissions:
      pages: write     # 发布到 Pages
      id-token: write  # OIDC 身份认证
```

`build` 不拿 OIDC，`deploy` 不读仓库内容，每个 job 只拿它需要的权限。

**2. 并发隔离**

`concurrency.group` 按 PR 编号或 git ref 区分，避免 PR 构建与 `main` 部署互相取消。同一 ref 上的连续推送仍会取消进行中的旧 run。

**3. Hugo / Node 版本集中管理**

Hugo 版本写在 `.hugo-version`：

```text
0.164.0
```

工作流读取后传给 `peaceiris/actions-hugo`。升级 Hugo 只改这一处。

Node 用 `setup-node` 的 `node-version-file: ".node-version"`，不必再手写一步 `cat`。

**4. Hugo 资源缓存**

```yaml
      - name: Setup Hugo resource cache
        uses: actions/cache@v6
        with:
          path: resources/_gen
          key: ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-${{ hashFiles('package-lock.json', 'assets/**', 'config/**', 'layouts/**', 'data/**') }}
          restore-keys: |
            ${{ runner.os }}-hugo-${{ steps.hugo-version.outputs.version }}-
```

Hugo 处理 SCSS、图片等资源时会把中间产物放在 `resources/_gen`。缓存 key 绑定 Hugo 版本与资产/配置/模板/数据哈希；纯改 Markdown 时仍可命中旧缓存。不要把整个 `content/**` 塞进 key，否则几乎每次发文都会强制重建缓存。

**5. 严格构建与 npm 统一入口**

CI 使用 `npm run build:site -- --panicOnWarning --logLevel warn`：警告直接失败，比事后 `grep` 日志更可靠。`build:site` / `build:search` 与本地脚本一致，减少「本地能过、CI 挂」的偏差。

**6. PR 只验证、不上传**

`pull_request` 仍跑 format 与完整构建；`Upload Pages artifact` 与 `deploy` 都带 `if: github.event_name != 'pull_request'`，避免 PR 占用 artifact 存储。

### 按需裁剪

如果你的项目不需要 `Node.js`、也不需要额外生成搜索索引，可以把下面这些步骤删掉：

- `Setup Hugo resource cache`
- `Setup Node.js`
- `Install root dependencies`
- `Check format`
- `Build search`
- `Verify Pagefind artifacts`

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
2. 把 Hugo 版本号放在 `.hugo-version` 文件里单独管理；Node 用 `.node-version` + `node-version-file`。升级时只改对应版本文件。
3. 本地构建命令和工作流构建命令保持一致，都通过 `package.json` 里的 `npm` 脚本调用；CI 可额外加 `--panicOnWarning`。
4. 为 Hugo 配置 `resources/_gen` 缓存（`actions/cache`）；缓存 key 带上 Hugo 版本与资产/配置/模板哈希，不要把整站 `content/**` 绑死。
5. 并发组按 PR / ref 隔离；PR 只构建不部署、不上传 Pages artifact。
6. 生产工作流 pin action 到 commit SHA，并用 Dependabot 的 `github-actions` 生态做分组升级；注释里的版本号要与 SHA 同步，或干脆不写易过期的注释。
7. 每次改域名、改资源路径、改搜索方案时，同时检查 `baseURL` 和发布流程。
8. 站点能正常发布后，再去处理自定义域名和 HTTPS。

按这套方式整理后，博客的日常维护会简单很多，发布链路也更直观。
