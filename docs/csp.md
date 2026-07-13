# Content Security Policy 部署说明

GitHub Pages 不能通过静态构建产物设置 HTTP 响应头。请在位于 GitHub Pages 前方的 CDN 或 WAF 中，为主站响应设置以下 `Content-Security-Policy` 头：

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests
```

在启用 `script-src` 与 `style-src` 前，必须先为模板中的内联主题初始化、搜索高亮、JSON-LD 和搜索页样式配置 CDN nonce 或构建期 hash。不要以 `unsafe-inline` 放宽策略。

`static/love.html` 是独立静态页，若也需要 CSP，必须按该页面的脚本与样式单独测试并配置策略。
