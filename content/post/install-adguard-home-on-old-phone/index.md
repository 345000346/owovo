---
title: "在闲置手机上安装 AdGuardHome"
date: 2020-12-20T22:19:10+08:00
slug: "install-adguard-home-on-old-phone"
description: "在 root 后的小米 3（cancro）上通过 Magisk 模块安装 AdGuardHome，利用闲置手机搭建局域网 DNS 去广告服务器。模块已停止维护，附现代化替代方案。"
tags: ["AdGuard Home", "DNS", "小米", "路由器"]
---

本文记录 2020 年在闲置多年的小米 3（cancro）上，通过 Magisk 模块安装 `AdGuardHome`、在局域网内去广告的过程。

> **时效性提醒：** 文中使用的 [`AdGuardHome_For_Magisk`](https://github.com/E7KMbb/AdGuardHome_For_Magisk) 模块最后一次更新在 2020 年，其在线下载安装包的脚本可能已失效；Magisk 与新版 Android 的兼容情况也与当年不同。若只是想在局域网内部署 AdGuard Home，更推荐在 NAS、路由器或常开的 Linux 小主机上用 Docker 部署（参见[在飞牛NAS上搭建 AdGuard Home + SmartDNS](/post/adguardhome-smartdns-on-fnos/)）。以下命令仅作为旧设备的历史参考，现代环境请优先核对各项目当前文档。

<!--more-->

## 使用 Magisk 模块

1. 首先手机上要有 `Magisk` ，然后安装好 [`Busybox`](https://github.com/meefik/busybox/releases) 和 `termux` ， `termux` 酷安有

2. 安装好后，打开 `Busybox` ，给 `Root` 权限，安装

3. 到 [`AdGuardHome_For_Magisk`](https://github.com/E7KMbb/AdGuardHome_For_Magisk) 的 Releases 页面下载打包好的模块 ZIP（不是源码压缩包），在 `Magisk` 管理器中选择“从本地安装”刷入。若下载到的 ZIP 内还有一层同名文件夹，按照文末“注意”第 1 条去掉一层后再刷入

4. 刷入重启之后，打开 `termux` ，给 `root` 权限

    输入 `su` ，然后再输入 `AdGuardHome_control start` ，就可以了。默认管理地址是 `你的手机IP地址:3000` ，也可以从内网其他终端访问

5. 配置好 `AdGuardHome`

6. 将路由器 `DNS` 地址指向手机的 `IP` 地址

## 注意

1. 如果模块刷入失败的话，是因为下载的 `zip` 包有两层，去掉一层文件夹就好了

2. 由于脚本需要在线下载 `AdguardHome` 安装包，所以国内下载会很慢，需要加速，请自寻方法

3. 最好在路由器上给手机固定一个静态 `IP` ，避免手机内网 `IP` 变动导致失效

4. `AdGuardHome_control` 命令支持 `start` | `stop` | `restart`

5. 想要取消该功能，通过 `Magisk Manager` 卸载该模块即可，注意将路由器 `DNS` 地址改回
