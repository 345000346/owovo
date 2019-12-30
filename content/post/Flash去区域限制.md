---
title: "Flash去区域限制"
date: 2019-12-30T02:35:38+08:00
toc : true
tags: ["工具"]
categories : ["工具"]
---

本以为国区最多也就在安装包添加几个推广勾选的，现在看来是彻底没法用了。

<!--more-->

## （一）下载离线安装包

首先，请使用 “正确姿势” 下载以下离线安装包

【Internet Explorer - ActiveX】

https://fpdownload.macromedia.com/pub/flashplayer/latest/help/install_flash_player_ax.exe

https://fpdownload.macromedia.com/get/flashplayer/latest/help/install_flash_player_ax.exe

【Firefox - NPAPI】

https://fpdownload.macromedia.com/pub/flashplayer/latest/help/install_flash_player.exe

https://fpdownload.macromedia.com/get/flashplayer/latest/help/install_flash_player.exe

【Chrome（嵌入式）- PPAPI】

https://fpdownload.macromedia.com/pub/flashplayer/latest/help/install_flash_player_ppapi.exe

https://fpdownload.macromedia.com/get/flashplayer/latest/help/install_flash_player_ppapi.exe

## （二）安装离线安装包

然后断网安装上述离线安装包（或者用防火墙阻止安装程序联网）

## （三）替换文件

**和谐文件作者：卡饭论坛・风之咩～ https://bbs.kafan.cn/thread-2123485-1-1.html**

如果你是 32 位系统，将 32 位文件替换到 `C:\Windows\System32\Macromed\Flash` 下覆盖同名文件

如果你是 64 位系统，将 32 位文件替换到 `C:\Windows\SysWOW64\Macromed\Flash` 下覆盖同名文件，将 64 位文件替换到 `C:\Windows\System32\Macromed\Flash` 下覆盖同名文件

## （四）注意事项

（1）ActiveX 版并不是不用 IE 就不需要安装的，很多软件都可能需要调用，为了兼容性和稳定推荐安装，考虑到 QQ 需求，还需要安装 PPAPI 版。

（2）替换 ActiveX 版时提示 “目标文件夹访问被拒绝 -- 您需要权限来进行此操作”，请在原版文件上右键 —— 属性 --- 安全 --- 高级 --- 权限 --- 更改权限 --- 把拒绝的权限项目全都删掉。

（3）Windows 10 的 Edge 和 IE 的 ActiveX 版 flash 是通过系统补丁的方式推送安装，这样安装的 Flash 插件没有区域限制问题，无须替换。

（4）Google Chrome 自身更新的 PepperFlash 也是有地区限制的，所以 ——

1. 如果不在系统里安装 PPAPI 版 Flash，而使用 PepperFlash 的话，也要用上述修改好的文件替换；

2. 如果使用系统里安装的 PPAPI 版 Flash，那么建议屏蔽 Chrome 自身更新的 PepperFlash，方法如下：
   
     直接删除 chrome 的 User Data 目录下的 PepperFlash 文件夹
     再建立同名占位文件（注意把扩展名删了），设置为只读
     
3. 如果使用耍下的 GreenChrome 增强补丁（ 6.5.2 及以上版本才支持），那么可以不用替换 PPAPI 版 Flash 的和谐文件（注意 GreenChrome 的解除 Flash 区域限制只针对 Chrome 有效）。

4. Chrome 和任何基于 Chromium 的浏览器，请直接使用 [“Adobe  Flash Player PPAPI **.0.0.*** for Chromium”](https://www.lanzous.com/b0i6p2qh) 直接替换文件，路径是 User Data\PepperFlash\**.0.0.***\ 下的 manifest.json 和 pepflashplayer.dll。（注：**.0.0.*** 指的是 Flash 的版本号）