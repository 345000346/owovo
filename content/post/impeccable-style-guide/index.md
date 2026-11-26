---
title: "Impeccable.style 使用指南：给 AI 一套设计 vocabulary"
date: 2026-11-16T00:00:00+08:00
description: "基于 impeccable 4.9.x 的 Impeccable.style 使用指南：用 PRODUCT.md / DESIGN.md 建立上下文，调用 24 个设计命令，靠设计 hook 与 62 条规则检测器拦住 AI 界面套路。"
tags: ["AI", "前端设计", "Impeccable.style", "工具"]
---

让 AI 写一个能跑的页面很容易，让它写出不像 AI 做的页面很难。同一句“做个落地页”，不同模型、不同项目里会反复冒出相似的痕迹：全站 Inter、紫到蓝的渐变、卡片里套卡片、彩色背景上的灰字，以及每个标题上方一枚圆角方形图标。

`Impeccable.style` 就是专门对付这件事的。它给 AI 编码助手一套设计词汇和一套检查规则：你用具体的命令推进设计，用上下文文件固定项目判断，再让检测器在代码交付前扫一遍那些可自动识别的“AI slop”。

本文按 2026 年 11 月 16 日的 `impeccable` skill v4.9.1 / CLI v4.9.2 与官方 README、文档整理。版本仍在快速迭代，动手前以 [官方仓库](https://github.com/pbakaus/impeccable) 和本机 `npx impeccable` 的输出为准。

<!--more-->

## 它解决什么问题

“让它更有设计感”这种话，模型只能猜；`/impeccable bolder the pricing cards` 则把一条明确的设计动作，连同一份针对该动作的 playbook，指向一个具体的目标。Impeccable 把设计工作拆成可单独调用的步骤，而不是塞进一条万能提示词。

它主要由三部分组成：

- **设计 skill**：装进 Claude Code、Cursor、Codex CLI、GitHub Copilot、Gemini CLI 等编码工具后，在对话里用命令推进设计。
- **检测器**：62 条确定性规则扫源码和渲染页面，不需要 LLM、不需要 API key，能发现套路化用字、低对比度、字号过小、跳过标题层级等常见问题。
- **设计 hook**：在你每次编辑 UI 文件后自动把检测结果交回给 agent，在它宣布“做完了”之前拦下问题；没有 hook 时，检测只发生在有人记得手动跑的时候。

三者配合的关键在于：skill 负责判断和推进，hook 与 CLI 负责用确定性规则做检查。检测器不会替你判断产品目标和真实用户，它只负责机器能确定的那部分。

## 安装与更新

在项目根目录执行：

```bash
npx impeccable install
```

安装器会检测你机器上有哪些编码工具，询问装到当前项目还是全局，并在支持 hook 的工具里提供设计 hook。**建议接受 hook**，否则检测只能靠手动触发。装完重新加载你的工具。

更新已有安装：

```bash
npx impeccable update
```

脚本里可以显式指定工具和范围：

```bash
npx impeccable install --providers=claude,codex,cursor --scope=project
```

几个容易踩的点：

- 在 **Codex** 里，命令写成 `$impeccable init`，或者打开 `/skills` 找到它；不是 `/impeccable init`。
- Claude Code、GitHub Copilot、Grok Build 等工具还有插件形式的安装入口，详见官方 README。
- 完整命令清单用 `/impeccable`（Codex 用 `$impeccable`）查看；配置、忽略规则和 hook 的允许步骤在各自工具的文档里。
- Node 只用于 `npx`；skill 本体运行的是随包附带或首次下载到 `~/.impeccable/bin/` 的自包含引擎。

## 先建立上下文，再谈设计

Impeccable 的效果高度依赖它知道多少项目背景。它读得了代码，但读不出你的用户是谁、他们要完成什么任务、哪些决定必须保留。上下文存在两个 Markdown 文件里：

- `PRODUCT.md`：用户、目标、平台、约束、术语和已经确认的品牌承诺。
- `DESIGN.md`：共享的视觉系统——颜色、字体、组件和视觉规则。

新项目先运行一次：

```text
/impeccable init
```

它会读代码、只问推断不出来的问题，然后写出 `PRODUCT.md`。后续所有设计命令都会读这个文件。`init` 不会自动生成 `DESIGN.md`。

接手已有项目、想保留既有视觉风格时，再运行：

```text
/impeccable document
```

它把当前实现里的颜色、字体、布局和组件记录到 `DESIGN.md`。记得读一遍再拿它去指导后续工作，把偶然形成的写法和过时的决定改掉。

这两份文件都该提交进仓库。`.impeccable/` 下的 `config.json`、`.impeccable/surfaces/*.md`、`.impeccable/critique/*.md` 等共享产物也建议保留；截图、缓存和运行时状态则交给 `.gitignore`。官方 README 里给出了可直接复制的忽略规则。

## 24 个命令怎么用

命令不必按顺序全部跑一遍。真正有效的是：选最能描述当前问题的那个命令，并尽量把目标缩小到一个区块或一条流程——一个被认真评审的表单区，胜过被扫一眼的整页。

### 规划与建立上下文

| 命令 | 作用 |
| --- | --- |
| `init` | 建立产品上下文，写入 `PRODUCT.md` |
| `document` | 从现有实现提取视觉系统，写入 `DESIGN.md` |
| `shape` | 写代码前规划 UX |
| `extract` | 把重复出现的模式收进设计系统 |

`craft` 是普通新建流程的弃用别名，新工作优先用 `shape`。

### 评审

| 命令 | 作用 |
| --- | --- |
| `critique` | 按可用性启发式打分，按优先级排出该修的地方 |
| `audit` | 技术质量报告，覆盖可访问性、性能、主题和响应式，结论按 P0（阻塞）到 P3（打磨）分级 |

页面“看着不对”但说不清哪里不对时，用 `critique`；上线前要建质量基线，用 `audit`。两者可以连着用。

### 调整方向

| 命令 | 作用 |
| --- | --- |
| `bolder` | 放大过于保守、平淡的设计 |
| `quieter` | 压低过响、过密、过度刺激的元素 |
| `distill` | 删掉页面不需要的东西，突出重点 |
| `colorize` | 给灰扑扑的界面引入策略性色彩 |
| `typeset` | 修字体、层级和字号 |
| `layout` | 修间距、分组和视觉节奏 |
| `animate` | 加入有目的的过渡与交互反馈 |
| `delight` | 加入恰当的个性与记忆点 |
| `overdrive` | 尝试 shader、弹簧物理、滚动驱动等更复杂的体验 |

### 收尾与修复

| 命令 | 作用 |
| --- | --- |
| `polish` | 交付前的最后一遍：对齐、间距和一致性 |
| `harden` | 补错误态、国际化、溢出和边界情况 |
| `clarify` | 重写不清楚的标签、说明和错误信息 |
| `adapt` | 适配不同屏幕尺寸和设备 |
| `optimize` | 诊断并修复加载、渲染与交互性能 |
| `onboard` | 设计首次使用、空状态和激活流程 |

### 在浏览器里迭代

| 命令 | 作用 |
| --- | --- |
| `live` | 在运行中的开发页面上选元素、挑方向、热替换多个变体，接受后写回源码 |
| `generate` | 直接生成某个指定元素的多个变体，不用手动逐个挑 |

`live` 支持 Vite、Next、SvelteKit、Astro、Nuxt 和普通 HTML。它只应该改本地 checkout：不要把 live 脚本注入线上站点，也不要为了让它工作而削弱生产环境的 CSP。Apply 功能会把排队的文案改动交给聊天里的 agent；如果上一分钟内没有 agent 轮询，它会退而调用 `PATH` 里的 `codex`（没有则用 `claude`），且关闭审批、权限检查和沙箱——在不熟悉的仓库里用之前，先看一眼 `package.json` 里可选的 `impeccable:manual-edit-validate` 脚本。

## 两条实际流程

### 从零做一个页面或功能

```text
/impeccable init
/impeccable shape the pricing page
/impeccable bolder the hero
/impeccable audit the pricing page
/impeccable harden the checkout form
/impeccable polish the pricing page
```

新落地页和展示型页面还可以选择先生成一张高保真 comp 再照着实现（更出效果，但更慢），或者直接在代码里构建（更轻、更快）。这个选择在 `init` 时问一次，存为 `.impeccable/config.json` 里的 `buildPath`，决策页也能单次覆盖；只有当前工具能生成图片时才会出现。应用界面和文档类页面始终直接用代码构建。

### 改进已有项目

```text
/impeccable document
/impeccable critique the onboarding flow
/impeccable typeset the settings page
/impeccable quieter the landing page
/impeccable polish settings
/impeccable audit the onboarding flow
```

`document` 先记录既有视觉系统；`critique` 判断层级和体验，`typeset`、`quieter` 分别处理阅读节奏和视觉强度；涉及可访问性、性能、响应式或主题一致性时补一次 `audit`，最后用 `polish` 收尾。结构还没成立时别先 `polish`，否则只是把错误方向上的细节做得更精致。

## 三种运行检测器的方式

### 1. 编辑时自动检查（设计 hook）

安装时接受的设计 hook，会在 agent 每次编辑 UI 文件后扫描并把发现交回去。这是最省心的位置：不用记得去跑，多数 slop 会在 agent 收工前被拦住。支持 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build 和 Hermes Agent。

Codex 里还需要在 `/hooks` 里批准项目 hook（改变了 hook 的更新之后要再批准一次）；Grok Build 用 `/hooks-trust` 或带 `--trust` 启动；Hermes Agent 是插件，运行一次 `hermes plugins enable impeccable-design-hook`。

注意：hook 跑在模型的命令审批之外。在 Claude Code 里，即使你拒绝模型自己的命令，已安装的命令 hook 仍可能运行，第一次编辑时还可能下载引擎。无人值守运行前先检查已安装的 hook，或用 `--settings '{"disableAllHooks": true}'` 关掉。

### 2. CI 或终端里的 CLI

```bash
npx impeccable detect src/                   # 扫目录
npx impeccable detect https://example.com    # 扫渲染后的页面（用已安装的 Chrome 或 Edge）
npx impeccable detect --json .               # 机器可读输出
npx impeccable detect --github src/          # GitHub Actions 注释
npx impeccable detect --list-rules           # 列出全部规则及 id、说明
```

JSX、TSX 这类源码文件只能跑模式类规则；低对比度、字号过小这类需要渲染页面的规则，要在扫 URL 时才执行，所以也把 CLI 指向开发服务器：`npx impeccable detect http://localhost:5173`。

退出码 `2` 表示有发现，`1` 表示目标无法扫描。品牌字体想全局放行，用 `npx impeccable ignores add-value overused-font Inter --reason "Brand font"`；单个文件临时关掉某条规则，加注释 `<!-- impeccable-disable overused-font: exported brand doc -->`。规则配置也支持 `DESIGN.md` 上下文——面对有依据的品牌规范或刻意设计，记录原因后局部忽略，别为了让检查变绿而机械删掉所有被标记的实现。

### 3. 浏览器里的可视化叠加

官方提供 Chrome 扩展，把同一批发现叠加在任意活页面上，自己的或别人的都可以，适合做视觉化评审。

## 几个容易忽略的细节

**原生应用。** 在 `PRODUCT.md` 里把 `## Platform` 设为 `ios`、`android` 或 `adaptive`（一套 Flutter / React Native 代码分别遵循两个系统），设计命令会按 Apple HIG 或 Material 3 而不是 Web 惯例工作，`audit` 与 `adapt` 换成原生版本，原生 audit 能直接读 SwiftUI、Compose、React Native 或 Flutter 源码。检测器、live 模式和编辑 hook 仍只支持 Web。

**依赖上下文的“通用”。** 如果结果很泛、没说到用户的心事，先查上下文：把 `PRODUCT.md` / `DESIGN.md` 里缺的补上、错的改正，再告诉 agent 还差什么。上下文越准，设计越不像模板。

**遥测。** 新设计开始时，skill 会从 impeccable.style 的目录拉取一组视觉方向。关闭遥测不会阻止这个请求，只是不再匿名记录展示了哪些方向、你选了哪个——项目名、文件、代码和 `PRODUCT.md` 都不会发送。可以用 `npx impeccable telemetry off`、`DO_NOT_TRACK=1`，或项目配置里的 `"telemetry": false` 关掉。

**出问题先 doctor。** `/impeccable doctor` 会找出过时的上下文文件、失效的设置和断掉的 hook。

## 总结

把 Impeccable 用好，靠的不是背下 24 个命令，而是让每一步有明确对象：

1. 用 `init` / `document` 把产品和视觉上下文落到文件里，并提交进仓库。
2. 用 `shape`、`critique`、`audit` 或定向的专项命令，指出当前最该解决的一处问题。
3. 接受设计 hook，让检测在编辑时自动发生；提交前再用 `npx impeccable detect` 补一次 CLI 扫描，扫源码也扫渲染页面。
4. 在浏览器里用 `live` 反复比较变体，直到结果对得上你的用户和品牌。

## 参考链接

- 官网首页：<https://impeccable.style/>
- 官方文档：<https://impeccable.style/docs/>
- 官方仓库：<https://github.com/pbakaus/impeccable>
- 更新日志：<https://impeccable.style/changelog>
- CLI 包与完整选项：<https://www.npmjs.com/package/impeccable>

> 核验范围：本文依据 2026 年 11 月 16 日官方仓库 README、官方文档与更新日志，以及 npm 上的 skill v4.9.1 / CLI v4.9.2 整理。命令、规则数与迭代方式还在快速变化，使用前以本机 `npx impeccable --help`、文档和各命令页为准。
