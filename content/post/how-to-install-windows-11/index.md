---
title: "如何安装 Windows 11 系统"
date: 2026-05-16T12:00:00+08:00
lastmod: 2026-05-16T12:00:00+08:00
slug: "how-to-install-windows-11"
categories: ["Windows"]
tags: ["Windows","系统","工具"]
toc: true
---

本文讲述如何安装一个干净的 Windows 11 系统。

<!--more-->

## 硬件要求

Windows 11 对硬件有最低要求：

- **处理器**：1 GHz 或更快，2 核及以上，64 位兼容
- **内存**：4 GB 及以上
- **存储**：64 GB 及以上
- **TPM**：受信任的平台模块 (TPM) 2.0
- **显卡**：支持 DirectX 12 或更高版本，WDDM 2.0 驱动
- **显示器**：>9 英寸，720p 以上分辨率

如果不满足 TPM 2.0 或 Secure Boot 要求，可通过 Ventoy 或 Rufus 制作启动盘时自动绕过。

## 需要准备的材料

- Windows 11 安装镜像（ISO 文件）
- 大于 8 GB 的空 U 盘

## 下载系统镜像

推荐从微软官方直接下载，确保镜像干净无捆绑。

**方式一：Media Creation Tool**

访问[微软 Windows 11 下载页面](https://www.microsoft.com/zh-cn/software-download/windows11)，下载"创建 Windows 11 安装媒体"工具，按提示操作即可自动下载 ISO。

**方式二：直接下载 ISO**

在同一页面，选择"下载 Windows 11 磁盘映像 (ISO)"，选择版本后下载。

**方式三：UUP dump**

[UUP dump](https://uupdump.net/) 可以从微软更新服务器直接拉取 Windows 组件并打包成 ISO。适合需要特定版本或 Insider Preview 的场景。

1. 打开 UUP dump 网站，搜索需要的 Windows 11 版本
2. 选择语言（如 `中文（简体）`）和版本（如 `Windows 11 Pro`）
3. 选择下载方式，推荐"下载并转换为 ISO"
4. 下载生成的脚本压缩包，解压后运行 `uup_download_windows.cmd`，脚本会自动下载文件并生成 ISO

## 制作启动盘

### 方式一：Ventoy（推荐）

[Ventoy](https://www.ventoy.net/) 是一款开源工具，只需安装一次，之后将 ISO 文件直接复制到 U 盘即可启动，而且一个 U 盘可以同时存放多个系统镜像。

1. 下载 [Ventoy](https://github.com/ventoy/Ventoy/releases)，解压后运行 `Ventoy2Disk.exe`
2. 选择目标 U 盘，点击"安装"（**首次安装会格式化 U 盘，请提前备份数据**）
3. 安装完成后，运行同目录下的 `VentoyPlugson.exe`，选择该 U 盘
4. 在左侧菜单选择"Windows"，启用"Bypass Windows 11 Hardware Check"，点击"OK"
5. 将下载好的 Windows 11 ISO 文件直接复制到 U 盘即可

Ventoy 的优势在于后续更换或更新系统镜像，只需删除旧 ISO、复制新 ISO 即可，无需重新刻录。

### 方式二：Rufus

[Rufus](https://rufus.ie/) 是传统的 ISO 刻录工具，将单个镜像写入 U 盘。

打开 Rufus，插入 U 盘，选择下载好的 ISO 镜像，点击"开始"。

如果电脑不满足 TPM 2.0 要求，Rufus 会弹出选项，勾选"移除对 TPM 2.0 / Secure Boot 的要求"即可。

**注意：此操作将删除 U 盘内所有文件。**

## 安装系统

1. 确认重要资料已备份，关机
2. 插入制作好的启动 U 盘，开机
3. 根据主板型号，按对应按键进入启动菜单：常见的有 `Del`、`F12`、`F2`、`F8`、`Esc`
4. 选择 U 盘启动
5. 进入安装界面后，选择语言和键盘布局，点击"下一步"
6. 点击"我没有产品密钥"（安装后可激活），选择需要的版本
7. 接受许可条款，选择"自定义：仅安装 Windows（高级）"
8. 选择目标硬盘/分区，可先格式化再选择，点击"下一步"
9. 系统将自动复制文件并多次重启，等待完成即可
10. 安装完成后按提示完成初始设置，即可进入桌面

## 安装后建议

- 连接网络，Windows 会自动下载安装驱动
- 前往"设置 → Windows 更新"安装最新补丁
- 按需安装常用软件
