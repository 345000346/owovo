---
title: "Impeccable.style 使用教程：给 AI 前端设计装上专业技能包"
date: 2026-05-27T00:00:00+08:00
lastmod: 2026-05-27T00:00:00+08:00
description: "Impeccable.style 是面向 AI coding tools 的前端设计技能系统（v3.1.1，23 个命令），把界面评估、结构调整、排版优化、适配补强等能力拆成可调用的命令。本文从安装到实战，带你完整上手。"
slug: "impeccable-style-guide"
toc: true
tags: ["AI", "前端设计", "Impeccable.style", "Claude Code", "工具"]
categories: ["技术"]
draft: false
---

AI 生成的前端页面往往千篇一律——Inter 字体、紫蓝渐变、卡片嵌套卡片。`Impeccable.style` 就是为了解决这个问题而生的：它不是几段 prompt，而是一套可以安装到本地、按问题拆分职责的前端设计技能系统，让 AI 做前端时更像一个真正懂设计质量的搭档。截至 2026 年 5 月，它已经发展到 **v3.1.1**，包含 **23 个命令**，支持 11 种 AI 编码工具。

<!--more-->

## 它到底是什么

`Impeccable.style` 起源于 Anthropic 原始的 `frontend-design` 技能，由 Paul Bakaus 开发维护。它把"先审计界面、再调整结构、再补强适配与鲁棒性、最后做增强和精修"这些设计动作，拆成了 23 个可以直接调用的命令。

GitHub 仓库：[pbakaus/impeccable](https://github.com/pbakaus/impeccable)（截至 2026 年 5 月已有 30,000+ 星）。

> 命令数量会随版本迭代持续增加，以你实际安装时官方仓库的清单为准。本文基于 v3.1.1 编写。

## 怎么安装

### Claude Code 安装

**方式一：从官网下载 ZIP**

访问 [impeccable.style](https://impeccable.style/)，下载 ZIP 包，解压后将 `.claude/` 目录中的内容复制到你的项目中：

```bash
cp -r dist/claude-code/.claude your-project/
```

如果想全局安装（对所有项目生效）：

```bash
cp -r dist/claude-code/.claude/* ~/.claude/
```

**方式二：从仓库安装**

克隆 [pbakaus/impeccable](https://github.com/pbakaus/impeccable) 仓库后，将 `dist/claude-code/.claude/` 下的内容复制到对应位置。

### 其他支持的工具

Cursor、OpenCode、Pi、Gemini CLI、Codex CLI、VS Code Copilot、Kiro、Trae、Rovo Dev、Qoder——官网均提供了对应的安装路径。

### 独立命令行工具

还提供了独立的 CLI 工具，无需 AI 工具也能运行反模式检测：

```bash
npx impeccable detect
```

## 怎么调用

安装完成后，在 AI 对话中直接输入斜杠命令即可：

```text
/audit
/critique
/polish
```

也可以在需求描述中明确指定希望使用的命令，例如"请用 `typeset` 优化这段内容页的排版"。

你还可以通过 `/impeccable pin <command>` 将常用命令创建为独立快捷方式。

## 新手推荐的起手路径

不建议一上来把 23 个命令全试一遍。最稳的起步方式是走一条主线：

```text
/teach
/audit 或 /critique
/layout 或 /typeset 或 /distill 或 /clarify
/adapt /harden /optimize
/polish
```

### 第一步：`/teach`

一次性收集项目的设计上下文，生成 `PRODUCT.md` 和 `DESIGN.md`：

- 这个产品是给谁用的
- 想呈现什么气质
- 哪些风格是明确不要的

做完这一步后，后续所有改动都会更稳，因为 AI 不用每次都从零猜你的审美和边界。

### 第二步：`/audit` 或 `/critique`

先判断问题，而不是直接动手。

- `/audit`：技术质量检查——可访问性、性能、响应式、主题一致性。更像全面体检。
- `/critique`：UX 设计审查——视觉层级、信息架构、情绪表达、整体体验。更像设计评审。

### 第三步：按症状选对应命令

- 布局松散、间距混乱、层级不清：`/layout`
- 字体普通、层级模糊、阅读不顺：`/typeset`
- 页面太满、太杂、抓不住重点：`/distill`
- 文案、标签、说明、错误提示不清楚：`/clarify`

### 第四步：交付前补强

- 多端是不是成立：`/adapt`
- 边界情况是不是扛得住：`/harden`
- 加载和动画是不是够顺：`/optimize`

### 第五步：最后打磨

方向、结构、稳定性都差不多以后，再上 `/polish`。它适合处理对齐、间距、细节一致性——是上线前的 final pass，不适合代替前面的诊断和结构调整。

## 23 个命令速查

| 你现在遇到的问题 | 命令 | 可以怎么理解 |
| --- | --- | --- |
| 根本不知道页面差在哪 | `/audit` | 全面体检，找出质量问题 |
| 想知道为什么看起来不够好 | `/critique` | 设计评审，看层级和体验 |
| 布局单调、间距混乱、节奏弱 | `/layout` | 修复布局和视觉节奏 |
| 字体选择普通、字号层级不清 | `/typeset` | 修复字体和排版 |
| 页面太满、太杂、抓不住重点 | `/distill` | 去掉不必要的复杂性 |
| 文案、标签、错误提示不清楚 | `/clarify` | 把 UX copy 讲明白 |
| 桌面端正常但换设备就变形 | `/adapt` | 多设备、多场景适配 |
| 正常情况没问题但边界扛不住 | `/harden` | 补强错误态、溢出、多语言 |
| 页面加载慢、动画卡、图片重 | `/optimize` | 性能和流畅度 |
| 页面方向没问题但细节不够顺 | `/polish` | 最后一轮打磨 |
| 页面太安全、太普通、没记忆点 | `/bolder` | 放大视觉冲击力 |
| 页面太吵、太硬、强调过多 | `/quieter` | 降噪，保留重点 |
| 页面太灰、太白、太平 | `/colorize` | 增加策略性色彩 |
| 交互太"死"，没有反馈感 | `/animate` | 有目的的动效和微交互 |
| 已经能用但缺少温度和记忆点 | `/delight` | 加一些讨喜的细节 |
| 做了很多页面想沉淀设计系统 | `/extract` | 提炼组件和 tokens |
| 新用户上来不知道干什么 | `/onboard` | 优化首次体验和空状态 |
| 想做超出常规的界面体验 | `/overdrive` | 高级转场、重交互、惊艳效果 |
| 从零构建一个新页面 | `/craft` | 先塑形再构建，含视觉迭代 |
| 编码前先规划 UX/UI | `/shape` | 先规划再动手 |
| 从现有代码生成设计文档 | `/document` | 自动生成 DESIGN.md |
| 实时浏览器中迭代视觉 | `/live` | 实时预览模式微调 |

> 完整命令列表随版本迭代更新，以安装时官方仓库的清单为准。上面这张表基于 v3.1.1 整理。

## 几个容易混淆的命令

### `audit` vs `critique`

- `/audit`：偏技术维度——有没有问题（可访问性、性能、响应式）
- `/critique`：偏设计维度——为什么不够好（视觉层级、信息架构、情绪表达）

### `bolder` vs `quieter`

方向相反的两个命令。先判断自己需要"加力"还是"降噪"，比盲目增强更重要。

### `layout` vs `polish`

- `/layout`：处理结构性问题——布局、间距、视觉节奏
- `/polish`：处理细节性问题——对齐、一致性、质感微调

`layout` 偏前期结构调整，`polish` 偏上线前收尾。

### `distill` vs `clarify`

- `/distill`：问题是太满太杂，需要做减法
- `/clarify`：问题是表达不清楚，需要改善文案

## 进阶用法

### `/craft` 一站式流程

如果你想一次性走完"先规划再构建"的完整流程，可以直接用 `/craft`。它会把 `shape` → 构建 → `critique` → 迭代串在一起，适合从零开始做一个新页面。

### `/live` 实时视觉迭代

`/live` 会在浏览器中启动一个实时预览模式，让你可以直接看到设计变更的效果，适合需要反复微调视觉细节的场景。

### 反模式检测

`Impeccable.style` 内置了 29 条确定性反模式规则和 12 条 LLM 批评规则（共 41 条），能自动识别常见的 AI 生成界面问题。可以通过独立 CLI 运行：

```bash
npx impeccable detect
```

### 领域参考知识

系统内置了 7 个领域的参考知识：typography（字体）、color-and-contrast（色彩与对比）、spatial-design（空间设计）、motion-design（动效设计）、interaction-design（交互设计）、responsive-design（响应式）、ux-writing（UX 文案）。当你使用 `/teach` 或 `/critique` 等命令时，这些参考知识会自动参与指导。

## 总结

如果只用一句话总结：

> `Impeccable.style` 不是一个"教 AI 把页面做漂亮"的小插件，而是一套可以本地安装、持续更新、按问题拆分职责的前端设计技能系统。

对新手最重要的，不是背命令名字，而是跑顺这条逻辑：

1. 先建立设计上下文：`/teach`
2. 再做问题诊断：`/audit` 或 `/critique`
3. 再按症状下手：`/layout`、`/typeset`、`/distill`、`/clarify`
4. 再做交付补强：`/adapt`、`/harden`、`/optimize`
5. 最后收尾：`/polish`
6. 真要上强度时，再考虑 `/overdrive`

## 参考链接

- 官网首页：<https://impeccable.style/>
- 官方文档：<https://impeccable.style/docs/>
- 官方仓库：<https://github.com/pbakaus/impeccable>
- 独立 CLI：<https://www.npmjs.com/package/impeccable>

> 说明：本文基于 2026 年 5 月 27 日对官方仓库（v3.1.1）和官网的整理。涉及命令数量、版本号等表述均以该日期为准。
