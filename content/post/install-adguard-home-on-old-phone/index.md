---
title: "在闲置手机上安装 AdGuardHome "
date: 2020-12-20T22:19:10+08:00
slug: "install-adguard-home-on-old-phone"
description: "在 root 后的小米 3（cancro）上安装 AdGuardHome，利用闲置手机搭建局域网 DNS 去广告服务器。"
toc: true
tags: ["AdGuard Home", "DNS", "小米", "路由器"]
categories: ["技术"]
---

今天在闲置多年的小米 3(cancro)上安装了 `AdGuardHome` ，用来局域网内去广告等

<!--more-->

### 使用 Magisk 模块

1.首先手机上要有 `Magisk` ，然后安装好 [`Busybox`](https://github.com/meefik/busybox/releases) 和 `termux` ， `termux` 酷安有

2.安装好后，打开 `Busybox` ，给 `Root` 权限，安装

3.下载 [`AdGuardHome`](https://github.com/E7KMbb/AdGuardHome_For_Magisk) 模块源码，到 `Magisk` 管理器中刷入

4.刷入重启之后，打开 `termux` ，给 `root` 权限

输入 `su`

然后再输入 `AdGuardHome_control start` ，就可以了

默认管理地址是 `你的手机IP地址:3000` ,也可以从内网其他终端访问

5.配置好 `AdGuardHome`

6.将路由器 `DNS` 地址指向手机的 `IP` 地址

### 注意

1.如果模块刷入失败的话，是因为下载的 `zip` 包有两层，去掉一层文件夹就好了

2.由于脚本需要在线下载 `AdguardHome` 安装包，所以国内下载会很慢，需要加速，请自寻方法

3.最好在路由器上给手机固定一个静态 `IP` ，避免手机内网 `IP` 变动导致失效

4.`AdGuardHome_control` 命令支持 `start` | `stop` | `restart`

5.想要取消该功能，通过 `Magisk Manager` 卸载该模块即可，注意将路由器 `DNS` 地址改回
