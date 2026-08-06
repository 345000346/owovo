---
title: "Impeccable.style 使用指南：让 AI 前端工作有设计流程"
date: 2026-08-07T00:00:00+08:00
slug: "impeccable-style-guide"
description: "基于 impeccable@3.5.0 CLI 的 Impeccable.style 使用指南：安装跨工具设计 skill、调用 23 个设计命令，并用 detect 在交付前扫描 60 条界面反模式规则。"
tags: ["AI", "前端设计", "Impeccable.style", "Claude Code", "工具"]
---

AI 能很快写出一个能运行的页面，却不一定能做出层级清楚、可访问、适配边界情况的界面。`Impeccable.style` 把这件事拆成一套跨 AI 开发工具使用的设计 skill，再配合可独立执行的 CLI 检测器：前者帮助 AI 规划、评审和改进界面，后者负责在代码层面发现常见的界面反模式。

本文按 2026 年 8 月 7 日 npm 上的 `impeccable@3.5.0` CLI 文档整理。skill 与 CLI 会分别迭代，安装前仍应以 [官方仓库](https://github.com/pbakaus/impeccable) 和 `npx impeccable skills help` 的输出为准。

<!--more-->

## 它解决什么问题

Impeccable 不是一条“把页面做漂亮”的通用提示词。它把设计工作拆为可选的步骤：先明确产品、用户和界面目标，再评审当前实现，最后针对排版、布局、适配、性能或交互逐项改进。

它包含两部分：

- **设计 skill**：安装到 Claude、Cursor、Gemini、GitHub Copilot、Codex 等 AI 开发工具后，在对话里调用设计命令。
- **CLI 检测器**：使用 `npx impeccable detect` 扫描 HTML、CSS、JSX、TSX、Vue、Svelte 文件或 URL，发现可自动识别的界面质量问题。

两者适合配合使用：skill 负责判断和改进，CLI 用确定性规则做交付前检查。CLI 不是视觉设计的替代品，也不能替代人工对产品目标和真实用户的判断。

## 安装、更新与查看命令

在项目根目录执行以下命令安装 skill：

```bash
npx impeccable skills install
```

要非交互地安装到指定工具和项目范围：

```bash
npx impeccable skills install -y --providers=claude,codex --scope=project
```

更新已安装的 skill：

```bash
npx impeccable skills update
```

查看当前版本实际提供的命令和安装说明：

```bash
npx impeccable skills help
```

CLI 的帮助文本也保留了 `npx impeccable install`、`update`、`link` 等兼容入口；在文档和自动化脚本中，优先使用上面的 `skills` 完整写法，语义更明确。

## 先建立项目上下文

安装完成后，推荐先在 AI 工具里执行：

```text
/impeccable init
```

`init` 会通过多轮提问建立项目上下文。它适合新项目，也适合已有代码但尚未明确目标用户、核心任务、界面气质和明确禁忌的项目。

已有页面需要先提取现有视觉系统时，可以使用：

```text
/impeccable document
```

新页面或功能还没开始实现时，用 `shape` 先做 UX/UI 规划：

```text
/impeccable shape
```

不要把命令名当成固定流水线。先选最能描述当前问题的命令，再根据结果决定下一步，通常比一次连续执行所有命令有效。

## 两条实用流程

### 从零做一个页面或功能

```text
/impeccable init
/impeccable shape
/impeccable audit
/impeccable adapt
/impeccable harden
/impeccable polish
```

`shape` 明确用户、任务和界面方向；`audit` 找技术质量问题；`adapt` 和 `harden` 分别检查多设备适配与生产边界；`polish` 放在最后处理对齐、间距和一致性。

### 改进已有项目

```text
/impeccable document
/impeccable critique
/impeccable layout
/impeccable typeset
/impeccable polish
```

`critique` 更关注视觉层级、信息架构和体验判断，`layout` 与 `typeset` 分别处理结构和文字阅读。若问题同时涉及可访问性、性能、响应式或主题一致性，在 `critique` 后补一次 `audit`。

## 23 个设计命令

当前 CLI 帮助列出 23 个具体设计命令；另有 `/impeccable` 作为统一的调度入口。`craft` 是普通新建流程的弃用兼容别名，新项目优先使用 `shape`。

| 类别 | 命令 | 适用场景 |
| --- | --- | --- |
| Build | `init` | 建立产品、用户和设计上下文 |
| Build | `shape` | 编码前规划 UX/UI |
| Build | `document` | 从现有代码提取视觉设计系统 |
| Build | `extract` | 提取可复用的模式、组件和设计 token |
| Build | `craft` | 兼容旧用法的普通新建流程别名 |
| Evaluate | `critique` | 评审层级、信息架构、认知负担和体验 |
| Evaluate | `audit` | 检查可访问性、性能、主题、响应式和反模式 |
| Refine | `polish` | 交付前处理对齐、间距和一致性 |
| Refine | `bolder` | 加强过于保守或平淡的视觉表现 |
| Refine | `quieter` | 降低过强、过密或过度刺激的视觉元素 |
| Refine | `distill` | 删除不必要的复杂性，突出重点 |
| Refine | `harden` | 补齐错误态、国际化、溢出和边界情况 |
| Refine | `onboard` | 设计首次使用、空状态和激活流程 |
| Enhance | `animate` | 添加有目的的动效和微交互 |
| Enhance | `colorize` | 为单调界面补充策略性色彩 |
| Enhance | `typeset` | 改善字体、层级、字号和阅读节奏 |
| Enhance | `layout` | 改善布局、间距和视觉节奏 |
| Enhance | `delight` | 增加恰当的个性与记忆点 |
| Enhance | `overdrive` | 探索技术复杂度更高的界面体验 |
| Fix | `clarify` | 改善标签、说明、错误信息和 UX 文案 |
| Fix | `adapt` | 适配不同屏幕尺寸、设备和使用场景 |
| Fix | `optimize` | 诊断并修复界面加载、渲染和交互性能 |
| Iterate | `live` | 在浏览器中交互式比较和迭代视觉变体 |

## 常见命令怎么选

### `audit` 与 `critique`

- `audit` 面向技术质量，重点是可访问性、性能、响应式、主题和可检测的反模式。
- `critique` 面向 UX 与视觉判断，重点是层级、信息架构、认知负担和整体体验。

页面“看起来不对”但原因不明时，先用 `critique`；上线前或需要建立质量基线时，使用 `audit`。复杂项目中两者可以连续使用。

### `layout`、`typeset` 与 `polish`

- `layout` 处理结构：内容分组、栅格、留白、间距和视觉节奏。
- `typeset` 处理阅读：字体选择、字号、字重、行长和层级。
- `polish` 处理收尾：对齐、细小间距、视觉一致性和完成度。

结构尚未成立时不要先 `polish`，否则只是把错误方向的细节做得更精致。

### `shape` 与 `document`

- `shape` 从需求出发，适合新页面和新功能。
- `document` 从已有实现出发，适合接手旧项目或补齐设计文档。

## 用 CLI 做交付前检测

扫描目录：

```bash
npx impeccable detect src/
```

扫描单个页面或线上 URL：

```bash
npx impeccable detect index.html
npx impeccable detect https://example.com
```

CI 或其他工具需要机器可读结果时：

```bash
npx impeccable detect --json src/
```

当前 CLI 有 60 条确定性检测规则，覆盖 AI 生成界面的常见痕迹、可访问性、颜色与对比度、排版、布局、动效和基础质量问题。检测到反模式时退出码为 `2`；未发现问题时为 `0`。部分建议性发现会单独列出，但不会计入失败数或改变退出码。

检测器支持项目配置、内联忽略规则和 `DESIGN.md` 上下文。面对经过验证的品牌规范或刻意设计，可以记录原因后局部忽略；不要为了让检查通过而机械地移除所有被标记的实现。

## 总结

把 Impeccable 用好的关键不是记住全部命令，而是让设计决策有顺序：

1. 用 `init` 或 `document` 补齐上下文。
2. 用 `shape`、`critique` 或 `audit` 判断当前最重要的问题。
3. 用对应的专项命令完成改进，并以 `polish` 收尾。
4. 在提交前运行 `npx impeccable detect`，把可自动识别的问题纳入检查。

## 参考链接

- 官网首页：<https://impeccable.style/>
- 官方文档：<https://impeccable.style/docs/>
- 官方仓库：<https://github.com/pbakaus/impeccable>
- CLI 包与完整选项：<https://www.npmjs.com/package/impeccable>

> 核验范围：本文依据 2026 年 8 月 7 日 npm `latest` 标签的 `impeccable@3.5.0` README 与 CLI 帮助输出整理。命令和规则会继续演进，使用前请以本机 `npx impeccable skills help` 与 `npx impeccable detect --help` 为准。
