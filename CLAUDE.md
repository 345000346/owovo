# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Hugo 的个人博客项目，使用 `echo` 主题，通过 GitHub Actions 自动部署到 GitHub Pages。

## 常用命令

```bash
# 安装依赖
npm install

# 构建前端资源（CSS + JS）
npm run build

# 开发模式（监听文件变化自动重新构建）
npm run dev

# 格式化代码
npm run format

# Hugo 本地预览（需要先构建前端资源）
hugo server

# Hugo 构建生产版本
hugo --minify
```

## 架构说明

### 配置结构

配置文件位于 `config/_default/` 目录，采用模块化拆分：
- `hugo.yaml` - 核心配置（URL、语言、主题、输出格式等）
- `params.yaml` - 网站参数（作者信息、社交链接、功能开关等）
- `menus.yaml` - 导航菜单配置
- `markup.yaml` - Markdown 渲染配置

### 模板覆盖机制

项目根目录的 `layouts/` 文件优先于 `themes/echo/layouts/` 中的同名模板。自定义模板放在根目录 `layouts/` 下，主题升级时不会丢失修改。

### 前端构建链

- **CSS**: `assets/css/main.css` → PostCSS (Tailwind CSS) → `static/css/style.css`
- **JS**: `assets/js/main.js` → Terser → `static/js/main.min.js`
- Tailwind CSS 扫描 `layouts/` 和 `content/` 目录中的类名

### 部署流程

推送到 `main` 分支触发 GitHub Actions：
1. 安装根目录和主题目录的 npm 依赖
2. 执行 `npm run build` 构建前端资源
3. 执行 `hugo --minify` 生成静态文件
4. 部署到外部仓库的 `master` 分支（自定义域名 owovo.xyz）

## 内容管理

- 文章存放在 `content/post/` 目录
- 文章 URL 格式：`/post/:slug/`
- 使用 `archetypes/default.md` 作为新建文章模板
