---
title: "LEDE下SmartDNS安装使用"
date: 2019-12-10T19:32:10+08:00
lastmod: 2026-05-18T00:00:00+08:00
slug: "smartdns-on-lede"
description: "在 LEDE/OpenWrt 路由器上安装配置 SmartDNS，实现 DNS 加速与广告过滤。已归档，推荐改用 AdGuard Home + SmartDNS 组合方案。"
tags: ["路由器", "DNS", "SmartDNS", "LEDE", "OpenWrt"]
categories: ["技术"]
outdated: true
outdatedNote: "本文内容已过时。LEDE 项目已于 2018 年合并回 OpenWrt，本文所述安装方式已不再适用。如需在现代环境中部署 SmartDNS + AdGuard Home 组合方案，请参阅 [在飞牛NAS上搭建 AdGuard Home + SmartDNS 实现网络加速与去广告](/post/adguardhome-smartdns-on-fnos/)。"
---

SmartDNS 是一个运行在本地的 DNS 服务器，SmartDNS 接受本地客户端的 DNS 查询请求，从多个上游 DNS 服务器获取 DNS 查询结果，并将访问速度最快的结果返回给客户端，提高网络访问速度。 同时支持指定特定域名 IP 地址，并高性匹配，达到过滤广告的效果。
与 dnsmasq 的 all-servers 不同，smartdns 返回的是访问速度最快的解析结果。

<!--more-->

## 1.  安装

   将软件使用 winscp 上传到路由器的 /root 目录，执行如下命令安装

   ```
    opkg install smartdns.xxxxxxxx.xxxx.ipk
    opkg install luci-app-smartdns.xxxxxxxx.xxxx.all.ipk
   ```

## 2. 修改配置

   登录 openwrt 管理页面，打开 `Services`->`SmartDNS` 进行配置。

   - 在 `Upstream Servers` 增加上游 DNS 服务器配置，建议配置多个国内外 DNS 服务器。
   - 在 `Domain Address` 指定特定域名的 IP 地址，可用于广告屏蔽。

## 3. 启用服务

   SmartDNS 中重定向选中``重定向53端口到SmartDNS``。

   - **启用 smartdns 的 53 端口重定向**

     登录路由器，点击 `Services`->`SmartDNS`->`redirect`，选择`重定向53端口到SmartDNS` 启用 53 端口转发。

   - **检测转发服务是否配置成功**

     使用 `nslookup -querytype=ptr 0.0.0.0` 查询域名
     看命令结果中的 `name` 项目是否显示为 `smartdns` 或`主机名`，如 `smartdns` 则表示生效

     ```
       pi@raspberrypi:~/code/smartdns_build $ nslookup -querytype=ptr 0.0.0.0
       Server:         192.168.1.1
       Address:        192.168.1.1##53
     
       Non-authoritative answer:
       0.0.0.0.in-addr.arpa  name = smartdns.
     ```

   - **界面提示重定向失败**

     - 检查 iptable，ip6table 命令是否正确安装。
     - openwrt 15.01 系统不支持 IPV6 重定向，如网络需要支持 IPV6，请将 DNSMASQ 上游改为 smartdns，或者将 smartdns 的端口改为 53，并停用 dnsmasq。
     - LEDE 之后系统，请安装 IPV6 的 nat 转发驱动。点击 `system`->`Software`，点击 `update lists` 更新软件列表后，安装 `ip6tables-mod-nat`
     - 使用如下命令检查路由规则是否生效。

     ```
       iptables -t nat -L PREROUTING | grep REDIRECT
     ```

## 4. 启动服务

   勾选配置页面中的 `Enable(启用)` 来启动 SmartDNS

## 5. 注意：

   - 如已经安装 chinaDNS，建议将 chinaDNS 的上游配置为 SmartDNS。
   - SmartDNS 默认情况，将 53 端口的请求转发到 SmartDNS 的本地端口，由 `Redirect` 配置选项控制。
