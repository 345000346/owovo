---
title: "将 Proxmox VE 5.4 升级到 Proxmox VE 6（使用国内源）"
date: 2019-08-29T20:09:11+08:00
slug: "upgrade-proxmox-ve-5-to-6"
TOC : true
tags: ["虚拟机","Proxmox","工具","路由器"]
categories : ["路由器"]

---

Proxmox VE 6.0 发布了正式版本，使用 Proxmox VE 5.4 的可通过官方提供的更新源升级到最新版本。

Proxmox 官方提供了更新升级指南：

[https://pve.proxmox.com/wiki/Upgrade_from_5.x_to_6.0](https://pve.proxmox.com/wiki/Upgrade_from_5.x_to_6.0)

但由于中国境内的更新下载速度太慢，所以可以使用中科大 USTC 镜像源，加快 apt 下载速度。
<!--more-->

## 一、更新 Proxmox VE 5.4 到最新版本

Proxmox VE 目前的最新版本是 Proxmox VE 5.4.11。在升级到 Proxmox VE 6 之前需要将其更新到最新的 5.4 版本。

使用下面的命令将 Proxmox VE 5.4 更新源替换为中科大 USTC 镜像源再更新到最新版本。

### 1.修改 debian 的镜像源地址

```
echo "deb https://mirrors.ustc.edu.cn/debian/ stretch main contrib non-free
deb-src https://mirrors.ustc.edu.cn/debian/ stretch main contrib non-free
deb https://mirrors.ustc.edu.cn/debian/ stretch-updates main contrib non-free
deb-src https://mirrors.ustc.edu.cn/debian/ stretch-updates main contrib non-free
deb https://mirrors.ustc.edu.cn/debian/ stretch-backports main contrib non-free
deb-src https://mirrors.ustc.edu.cn/debian/ stretch-backports main contrib non-free
deb https://mirrors.ustc.edu.cn/debian-security/ stretch/updates main contrib non-free
deb-src https://mirrors.ustc.edu.cn/debian-security/ stretch/updates main contrib non-free" > /etc/apt/sources.list
```

### 2.修改 pve 5.x 更新源地址

修改为 no subscription，不使用企业更新源

`echo "deb http://mirrors.ustc.edu.cn/proxmox/debian/pve/ stretch pve-no-subscription" > /etc/apt/sources.list.d/pve-no-sub.list`

### 3.关闭 pve 5.x 企业更新源

`sed -i.bak 's|deb https://enterprise.proxmox.com/debian stretch pve-enterprise|# deb https://enterprise.proxmox.com/debian stretch pve-enterprise|' /etc/apt/sources.list.d/pve-enterprise.list`

### 4.修改 ceph 镜像更新源

`echo "deb http://mirrors.ustc.edu.cn/proxmox/debian/ceph-luminous stretch main" >> /etc/apt/sources.list.d/ceph.list`

### 5.开始更新

`apt update && apt dist-upgrade`

## 二、升级 Corosync 到 Corosync 3

### 1.关闭高可用服务

如果只有一台 pve 的可以忽略

`systemctl stop pve-ha-lrm`

`systemctl stop pve-ha-crm`

### 2.添加 Proxmox Corosync 3 Stretch 存储库

`echo "deb http://mirrors.ustc.edu.cn/proxmox/debian/corosync-3/ stretch main"> /etc/apt/sources.list.d/corosync3.list`

### 3.运行命令更新

`apt update`

### 4.执行官方命令

根据官方手册支持执行

`apt list --upgradeable`

`apt dist-upgrade --download-only`

`apt dist-upgrade`

### 5.重新启动高可用服务

如果关闭了高可用服务的在更新完毕后需要重新启动高可用服务

`systemctl start pve-ha-lrm`

`systemctl start pve-ha-crm`

## 三、升级到 Proxmox 6.0

### 1.执行以下更新命令确保最新

`apt update`

`apt dist-upgrade`

### 2.执行镜像源更新命令

将 Debian 的镜像源更换为升级源

`sed -i 's/stretch/buster/g' /etc/apt/sources.list`

### 3.添加 Proxmox VE 6 的镜像存储库地址

`echo "deb http://mirrors.ustc.edu.cn/proxmox/debian/pve buster pve-no-subscription" > /etc/apt/sources.list.d/pve-no-sub.list`

### 4.修改其他镜像源的升级包地址

`sed -i -e 's/stretch/buster/g' /etc/apt/sources.list.d/pve-install-repo.list`

### 5.修改 Ceph 的升级包地址

`echo "deb http://mirrors.ustc.edu.cn/proxmox/debian/ceph-luminous buster main" > /etc/apt/sources.list.d/ceph.list`

### 6.开始运行更新命令

`apt update`

`apt dist-upgrade`

### 7.更新中遇到的问题

在更新的过程中会出现几次输入的交互，第一次提示 apt 相关信息，输入 Q 退出继续执行更新，直接确认回车即可。