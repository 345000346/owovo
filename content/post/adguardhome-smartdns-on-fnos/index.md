---
title: "在飞牛NAS上搭建AdGuard Home + SmartDNS 实现网络加速与去广告"
date: 2026-05-16T15:00:00+08:00
lastmod: 2026-05-16T15:00:00+08:00
slug: "adguardhome-smartdns-on-fnos"
description: "在飞牛 NAS (FnOS) 上通过 Docker Compose 部署 AdGuard Home + SmartDNS，SmartDNS 智能解析选优，AdGuard Home 过滤广告跟踪器，实现局域网 DNS 加速与去广告。"
categories: ["技术"]
tags: ["飞牛NAS", "AdGuard Home", "SmartDNS", "DNS", "Docker", "去广告"]
toc: true
---

飞牛NAS（FnOS）的 Docker 应用自带 Compose 功能，通过"新增项目"界面填写 YAML 即可部署，无需命令行操作。本文将介绍如何通过这种方式搭建 AdGuard Home + SmartDNS 组合，实现局域网广告过滤和 DNS 解析加速。

<!--more-->

## 为什么要搭配使用

**SmartDNS** 负责智能解析：它同时向多个上游 DNS 服务器发起查询，选择响应最快的 IP 返回。当某个域名被 DNS 污染时，SmartDNS 能通过测速从备选上游拿到正确结果。

**AdGuard Home** 负责广告过滤：基于域名规则拦截广告、跟踪器和恶意网站，还提供美观的 Web 管理面板和统计图表。

两者串联后，AdGuard Home 作为前端接收局域网设备的 DNS 请求，上游指向 SmartDNS，SmartDNS 再对接多个公共 DNS。这样既能在 AdGuard Home 中看到每台设备的查询日志，又能利用 SmartDNS 的速度优选和防污染能力。

```
设备 → AdGuard Home (:53) → SmartDNS (:6053) → 上游 DNS 服务器
```

## 环境准备

- 在路由器上为飞牛NAS 设置固定 IP，例如 `192.168.31.100`（小米路由器默认为 `192.168.31.x` 网段）

本文所有操作均在飞牛OS 网页管理界面中完成，无需 SSH。

## 安装 SmartDNS

### 创建配置目录和文件

打开飞牛OS 的"文件管理"，进入 Docker 存储目录（如 `/vol1/1000/`），新建文件夹 `smartdns`，并在其中新建子文件夹 `logs`。

然后在 `/vol1/1000/smartdns/` 下新建文件 `smartdns.conf`，写入以下内容：

```ini
# 监听设置
bind 127.0.0.1:6053
bind-tcp 127.0.0.1:6053
bind [::1]:6053
bind-tcp [::1]:6053

# 缓存条数，65536 约占用 10-20MB 内存，家用完全足够
cache-size 65536
cache-persist yes
cache-file smartdns.cache
cache-checkpoint-time 86400

# 乐观缓存与预取
prefetch-domain yes
serve-expired yes
serve-expired-ttl 259200
serve-expired-reply-ttl 3
serve-expired-prefetch-time 21600

# TTL 修正
rr-ttl-min 60
rr-ttl-max 86400
rr-ttl-reply-max 60

# 测速模式：TCP 优先，Ping 兜底
speed-check-mode tcp:443,tcp:80,ping

# 响应模式：返回最快 IP
response-mode fastest-ip

# 双栈寻优
dualstack-ip-selection yes
dualstack-ip-selection-threshold 20

# 国内大部分网络环境对 Type 65 记录支持不佳，会导致 iOS/macOS 设备转圈等待
force-qtype-SOA 65

# 日志与网络优化
log-level warn
tcp-idle-time 30

# 上游 DNS 节点池
# 阿里云公共加密 DNS（DoH）：防劫持，直接使用 IP 建立请求省去 Bootstrap DNS 解析
server-https https://223.5.5.5/dns-query -host-name dns.alidns.com
# DNSPod 公共 DoH：免费版已停止 IP 直连接入，改用域名
server-https https://doh.pub/dns-query
# Cloudflare 作为备用兜底，避免国内 DNS 全部故障时断网
server-https https://1.1.1.1/dns-query -host-name cloudflare-dns.com
```

### 通过 Docker 新增项目部署

打开飞牛OS 的 **Docker** 应用，切换到 **项目** 标签页，点击 **新增项目**，填写：

- **项目名称**：`smartdns`
- **Compose 配置**（粘贴以下 YAML）：

```yaml
services:
  smartdns:
    image: pymumu/smartdns:latest
    container_name: smartdns
    network_mode: host
    restart: always
    logging:
      options:
        max-size: "5m"
        max-file: "3"
    volumes:
      - /vol1/1000/smartdns:/etc/smartdns
      - /vol1/1000/smartdns:/var/lib/smartdns
      - /vol1/1000/smartdns/logs:/var/log/smartdns
      - /etc/ssl/certs:/etc/ssl/certs:ro
    environment:
      - TZ=Asia/Shanghai
```

`network_mode: host` 表示容器直接使用宿主机网络，SmartDNS 监听在宿主机的 6053 端口，无需额外端口映射。

填写完毕后点击 **部署**，等待镜像拉取完成即可。

部署后在 Docker 的 **容器** 标签页可看到 `smartdns` 运行状态。待 AdGuard Home 部署完成后，通过 AdGuard Home 面板即可验证整体链路是否正常，无需单独测试 SmartDNS。

## 安装 AdGuard Home

AdGuard Home 更简单——连配置文件都不用手动创建。

同样在 Docker 的 **项目** 标签页点击 **新增项目**：

- **项目名称**：`adguardhome`
- **Compose 配置**（粘贴以下 YAML）：

```yaml
services:
  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    network_mode: host
    restart: always
    volumes:
      - /vol1/1000/adguardhome/work:/opt/adguardhome/work
      - /vol1/1000/adguardhome/conf:/opt/adguardhome/conf
```

点击 **部署**，`work` 和 `conf` 目录会自动创建。部署完成后 AdGuard Home 直接监听宿主机 53（DNS）和 3000（管理面板）端口。

### 初始化配置

浏览器访问 `http://192.168.31.100:3000`，根据向导完成初始化：

1. **管理界面端口**：保持 `3000`
2. **DNS 服务器端口**：保持 `53`

> 如果端口 53 被飞牛NAS 系统自带的服务占用（常见情况），先在飞牛 SSH 中停用系统 DNS 解析服务：
> ```bash
> sudo systemctl stop systemd-resolved
> sudo systemctl disable systemd-resolved
> ```
> 然后编辑 `/etc/systemd/resolved.conf` 中的 `DNSStubListener=no`。

3. **设置管理员账户和密码**
4. **上游 DNS 服务器**：填入 `127.0.0.1:6053`（即指向 SmartDNS）
5. **并行请求**：勾选（可选，让 AdGuard Home 同时查询所有上游）

### 配置上游指向 SmartDNS

初始化完成后进入管理面板，在"设置 → DNS 设置"中：

- **上游 DNS 服务器**：`127.0.0.1:6053`
- **Bootstrap DNS 服务器**：留空
- **并行请求**：勾选
- **启用 DNSSEC**：不勾选
- **缓存大小**：设为 `0`（关闭缓存，统一由 SmartDNS 负责缓存）

> **为什么要关闭 AdGuard Home 的缓存？**
>
> SmartDNS 已配置了缓存和测速机制，如果 AdGuard Home 也开启缓存，会导致两层缓存叠加：SmartDNS 测速选出的最优 IP 被 AdGuard Home 缓存后，即使此后 SmartDNS 测出更优结果，AdGuard Home 仍会返回旧缓存。关闭 AdGuard Home 缓存，让 SmartDNS 全权负责解析结果的选择与缓存，能保证每次返回的都是当前最优 IP。

## 添加广告过滤规则

在"过滤器 → DNS 拦截列表"中，添加以下常用规则：

| 规则名称 | 地址 |
|---------|------|
| AdGuard DNS filter（内置） | 在"过滤器 → DNS 拦截列表"中直接启用 |
| 217heidai adblockfilters | `https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblockdns.txt` |

内置规则已能过滤大部分广告和跟踪器，补充一条 `217heidai` 规则即可覆盖国内常用场景，不必贪多。

## 将局域网设备指向 AdGuard Home

在路由器 DHCP 设置中，将 DNS 服务器地址改为飞牛NAS 的 IP（`192.168.31.100`），所有局域网设备就会自动使用 AdGuard Home 进行 DNS 解析。

如果路由器不支持修改 DHCP DNS，可以手动在每台设备的网络设置中，将 DNS 设为飞牛NAS 的 IP。

## 验证效果

### 验证 AdGuard Home

1. 打开 AdGuard Home 管理面板（`http://192.168.31.100:3000`），观察仪表盘中的查询统计
2. 在浏览器访问一些带广告的网站，确认广告是否被拦截
3. 使用 `nslookup` 从局域网设备查询域名，确认返回结果来自 AdGuard Home：

```bash
nslookup www.taobao.com 192.168.31.100
```

### 验证 SmartDNS 是否生效

SmartDNS 默认将自身主机名注入到 PTR 反向查询中，可以用以下命令检测：

```bash
nslookup -querytype=ptr 0.0.0.0 192.168.31.100
```

如果返回结果中的 `name` 字段显示为 `smartdns`，则说明 SmartDNS 已在正常工作。

也可以直接检查 AdGuard Home 的上游延迟——在管理面板的"设置 → DNS 设置"中点击"测试上游"，如果 `127.0.0.1:6053` 响应正常即为成功。

## 常见问题

**Q：飞牛NAS 重启后容器没有自动启动？**

A：检查 Docker Compose 中是否设置了 `restart: always`，飞牛NAS 的 Docker 默认会在开机后自动启动该策略的容器。

**Q：某些网站打不开？**

A：可能被广告规则误杀。在 AdGuard Home 的"查询日志"中找到被拦截的域名，点击"解除封锁"并加入自定义白名单。

**Q：如何更新规则？**

A：AdGuard Home 默认每 24 小时自动更新过滤规则，也可在"过滤器"页面手动点击"检查更新"。

**Q：路由器重启后 DNS 失效？**

A：确保飞牛NAS 为固定 IP，且路由器 DHCP DNS 设置指向该固定 IP。
