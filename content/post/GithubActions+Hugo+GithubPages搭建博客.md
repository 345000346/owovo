---
title: "Github Actions + Hugo + Github Pages搭建博客"
date: 2020-01-01T13:14:18+08:00
toc : true
tags: ["Github","Hugo"]
categories : ["Hugo"]
---

## 一、建立 Github Pages

在你的 Github 账号里新建一个 Repository ，仓库名必须为 [你的用户名]-github.io，必须使用 master 分支，这个就是你建立 Github Pages 的 Repository.

## 二、建立 Hugo 文章仓库

在你的 Github 账号里新建一个 Repository，名称什么的都随意，比如 myBlog.

## 三、编写 Github Actions 脚本

1.打开 Hugo 文章仓库中 Repository 的 Actions ，选择右边的 `skip this : Set up a workflow yourself`；

2.选择后，会出现一个 yml 文件的编辑器，里面的内容不用理会；

3.我们参考 [peaceiris/actions-hugo](https://github.com/peaceiris/actions-hugo) 和  [peaceiris/actions-gh-pages](peaceiris/actions-gh-pages) 项目，编写自己的 workflow；

不废话，直接上代码

```makefile
name: Github Pages #自动化的名称
on:
  push: # push 的时候触发
     branches: # 那些分支需要触发
      - master
jobs:
  build:
    runs-on: ubuntu-latest # 镜像市场
    steps:
      - name: checkout # 步骤的名称
        uses: actions/checkout@master #软件市场的名称
        # with: # 参数
         # submodules: true
      - name: Setup Hugo # 安装 Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest' # 使用Hugo最新版
          extended: true
      - name: Build # 编译
        run: hugo --minify
      - name: Deploy # 部署
        uses: peaceiris/actions-gh-pages@v2
        env:
         ACTIONS_DEPLOY_KEY: ${{ secrets.ACTIONS_DEPLOY_KEY }}
         EXTERNAL_REPOSITORY: 你的用户名/你的用户名.github.io
         PUBLISH_BRANCH: master
         PUBLISH_DIR: ./public
```

**注：25 行的 你的用户名 填写你的 Github 用户名**

## 四、准备部署

我们开发的项目和 Github Pages 是分开的，所以用了两个 Repository，接下来就是要在你将 Hugo文章推到 myBlog 这个 Repository 后，部署到 Github Pages.

首先我们要在你的电脑上安装 Git ，这是[官网](https://git-scm.com/)，下载安装我就不多说了，一般直接下一步即可。

### 1.生成提交代码用的 *ssh key*

打开 cmd ，或者 Powershell ，输入

```
ssh-keygen -t rsa -b 4096 -C "$(git config user.email)" -f gh-pages -N ""
# 你会得到以下这两个文件:
#   gh-pages.pub (public key)
#   gh-pages     (private key)
```

**注：这两个文件可能在 `C:\Users\[你的电脑用户名]\.ssh` 下，也可能在打开的命令行目录下。**

### 2.填写密钥

假设 Hugo 文章的 Repository 名字是 `myBlog`，部署的项目为 `[你的用户名].github.io`

打开 `myBlog` 仓库的 `settings`，再点击 `Secrets`，然后添加刚刚生成的私钥，`name` 为 `ACTIONS_DEPLOY_KEY`

打开 [你的用户名].github.io，点击 Deploy keys，添加公钥，`Allow write access` 一定要勾上，否则会无法部署

### 3.提交代码

然后，你就可以提交 Hugo文章 到 myBlog 仓库，Push 成功后，打开仓库 Actions，可以查看是否自动编译成功。

