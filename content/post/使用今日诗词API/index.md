---
title: "使用今日诗词API"
date: 2019-08-28T11:39:45+08:00
tags: ["今日诗词","API"]
categories : ["API"]
toc : true
---

今日诗词 API 是一个可以返回一句古诗词名句的接口。它可以通过图片和 JSON 格式调用。今日诗词 API 根据不同地点、时间、节日、季节、天气、景观、城市进行智能推荐。

<!--more-->

## 通用简单安装代码
在 HTML 中需要加载诗词的地方放置以下加载代码即可，和 网站统计 的安装方法一致。

```HTML
<span id="jinrishici-sentence">正在加载今日诗词....</span>
<script src="https://sdk.jinrishici.com/v2/browser/jinrishici.js" charset="utf-8"></script>
```
SDK 会自动寻找 id 或者 class 为 `jinrishici-sentence` 的标签，将里面的内容替换为诗词
如果需要在多个地方显示诗词，添加多个 `class=" jinrishici-sentence "` 的 span 即可
## 通用高级安装代码
如果你有其他需求（如获取作者、朝代等），可以调用我们提供的加载函数`jinrishici.load` 并传入回调函数，每调用一次，会传入一个新的诗词

```HTML
<script src="https://sdk.jinrishici.com/v2/browser/jinrishici.js" charset="utf-8"></script>
<script type="text/javascript">
  jinrishici.load(function(result) {
    // 自己的处理逻辑
    console.log(result)
  });
</script>
```
### result 返回的格式
#### 正确返回

```json
{
    "status": "success",
    "data": {
        "id": "5b8b9572e116fb3714e6faba",
        "content": "君问归期未有期，巴山夜雨涨秋池。",
        "popularity": 1170000,
        "origin": {
            "title": "夜雨寄北",
            "dynasty": "唐代",
            "author": "李商隐",
            "content": [
                "君问归期未有期，巴山夜雨涨秋池。",
                "何当共剪西窗烛，却话巴山夜雨时。"
            ],
            "translate": [
                "您问归期，归期实难说准，巴山连夜暴雨，涨满秋池。",
                "何时归去，共剪西窗烛花，当面诉说，巴山夜雨况味。"
            ]
        },
        "matchTags": [
            "秋",
            "晚上"
        ],
        "recommendedReason": "",
        "cacheAt": "2018-09-17T21:18:44.693645"
    },
    "token": "6453911a-9ad7-457e-9b9d-c21011b85a0c",
    "ipAddress": "162.248.93.154"
}
```

其中

`data.content` 是核心，即推荐的诗句

`data.matchTags` 是与你相关的标签，也是推荐给你的部分理由。

`data.recommendedReason` 是推荐原因，暂未支持。

`data.cacheAt` 是指我们会对每个 `Token` 进行预生成推荐数据并缓存。正常情况下我们会 10 分钟更新一次缓存数据。

`data.popularity` 是我们对这句诗的流行度评价

`data.origin` 源诗信息

`data.origin.translate` 是整诗翻译，部分诗词有，部分没有

`token` 是当前用户的 `token` ，原则上，同一个用户，一段时间内 Token 应该不变。

`ipAddress` 是当前用户的 `ip` ，如果 IP 有异常，您需要查明您是否在服务端调用

#### 错误返回

```json
{
    "status": "error",
    "errCode": 2001,
    "errMessage": "No matching handler"
}
```

`errcode` 是错误码，目前只有以下几种错误码，您也简单判断 HTTP 头中的状态码，对于错误返回，我们总不会返回 200

`1001` ：内部服务器错误，HTTP 状态码 500

`1002` ：API 路径不对，HTTP 状态码 404

`2002` ：Token 不是服务器签发，HTTP 状态码 400

`2003` ：IP 超过每日新用户限制，HTTP 状态码 400，这很有可能是您没有正确保存 Cookies 或者 Token

出错我们会帮你打在控制台上，您无需再次处理。
使用定制加载时，不要将标签的 id 或者 class 设置为 jinrishici-sentence ，否则 SDK 会自动加载一次
使用 load 之前，请确保 SDK JS 文件已经引入

### 高级版使用范例

可以复制到一个 HTML 文件用浏览器打开查看效果：

```HTML
<script src="https://sdk.jinrishici.com/v2/browser/jinrishici.js" charset="utf-8"></script>
<div id="poem_sentence"></div>
<div id="poem_info"></div>
<script type="text/javascript">
  jinrishici.load(function(result) {
    var sentence = document.querySelector("#poem_sentence")
    var info = document.querySelector("#poem_info")
    sentence.innerHTML = result.data.content
    info.innerHTML = '【' + result.data.origin.dynasty + '】' + result.data.origin.author + '《' + result.data.origin.title + '》'
  });
</script>
```