# Cloudflare + GitHub Pages（无备案）

目标：`https://owovo.xyz` 仍由 GitHub Pages 托管源站，DNS 与边缘缓存走 Cloudflare，改善跨境访问稳定性。  
不涉及国内 ICP 备案；大陆速度会好于直连 GitHub，但**不是**国内 CDN，部分运营商仍可能偏慢。

仓库侧：

- `config/_default/hugo.yaml` 中 `baseURL: "https://owovo.xyz"`
- `static/CNAME` 内容为 `owovo.xyz`（构建后进 `public/`，供 GitHub Pages 识别自定义域名）
- 自动化脚本：`scripts/setup-cloudflare.mjs`（API Token 配置 DNS / SSL / 缓存 / www 跳转）

---

## 一键脚本（推荐）

1. 域名已在 Cloudflare 添加且 **Active**（NS 已切到 CF）。
2. 创建 [API Token](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → 用 **Edit zone DNS** 模板后，再按需加上：
   - **Zone → Zone Settings → Edit**
   - **Zone → Zone → Read**
   - **Zone → DNS → Edit**
   - **Account → Account Rulesets → Edit** 或 **Zone → Cache Rules / Config Rules** 相关 Edit（用于 Cache Rules / Redirect）
   - Zone Resources：只选 `owovo.xyz`
3. 在仓库根目录执行（PowerShell）：

```powershell
$env:CLOUDFLARE_API_TOKEN = "你的Token"
$env:GITHUB_PAGES_HOST = "你的用户名.github.io"   # 不要带 https:// 或仓库路径
node scripts/setup-cloudflare.mjs
# 或: npm run cf:setup
```

预览不写变更：

```powershell
$env:CF_DRY_RUN = "1"
node scripts/setup-cloudflare.mjs
```

脚本行为：

- 根域 / `www` **CNAME 橙云** upsert；**会删除**这两个名称上冲突的 A / AAAA / 多余 CNAME
- SSL Full 等安全与性能项 → 静态长缓存 / HTML 短缓存 → `www` 301 到根域
- **默认严格**：任一步失败则打印失败列表并以 **exit 1** 退出（不会假成功）
- 权限不全仍想尽量推进时：`$env:CF_BEST_EFFORT = "1"`（失败只警告，exit 0；不推荐作默认）
- **不会**代替你在 GitHub Pages 里填写 Custom domain（需手动一次）

---

## 0. 前置条件

1. 域名 `owovo.xyz` 可修改 NS（或已在 Cloudflare）。
2. GitHub 仓库已开启 Pages，且用现有 workflow 部署到 GitHub Pages。
3. 知道 Pages 默认主机名，形如：
   - 用户站：`https://<user>.github.io/`
   - 项目站：`https://<user>.github.io/<repo>/`  
     绑定自定义域名后，**对外只用** `https://owovo.xyz`；下面 DNS 的 CNAME 目标填 **`<user>.github.io`**（不要带仓库路径）。

---

## 1. 把域名接到 Cloudflare

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com/)，**Add a site** → 输入 `owovo.xyz`。
2. 选 **Free** 计划即可。
3. Cloudflare 扫描现有 DNS 记录；先不要急着改，完成后再按下一节整理。
4. 在域名注册商处，把 NS 改成 Cloudflare 给出的两台（例如 `*.ns.cloudflare.com`）。
5. 等到 Cloudflare 显示域名 **Active**（通常几分钟到 48 小时）。

---

## 2. DNS 记录（推荐）

在 Cloudflare → **DNS** → **Records**，只保留与站点相关的记录，避免冲突的旧 A/CNAME。

| Type  | Name  | Target / Content   | Proxy status        | 说明                               |
| ----- | ----- | ------------------ | ------------------- | ---------------------------------- |
| CNAME | `@`   | `<user>.github.io` | **Proxied**（橙云） | 根域；Cloudflare 会做 CNAME 扁平化 |
| CNAME | `www` | `owovo.xyz`        | **Proxied**         | 可选；再在规则里跳到根域           |

说明：

- 不要同时用 GitHub 文档里的 A 记录 **和** 上述 CNAME 指到同一主机，二选一；**走 Cloudflare 代理时优先 CNAME → `*.github.io`**。
- 若暂时无法解析 `<user>`：打开仓库 **Settings → Pages**，Custom domain 旁或访问说明里会写默认 `*.github.io` 地址。
- 邮箱等 MX/TXT 记录按需保留，**Proxy 保持 DNS only（灰云）**。

### 可选：www → 根域

**Rules → Redirect Rules**（或 Bulk Redirects）：

- If：`http.host eq "www.owovo.xyz"`
- Then：动态跳转 `concat("https://owovo.xyz", http.request.uri.path)`，状态码 **301**
- 保留 query string

---

## 3. GitHub Pages 自定义域名

1. 确保本仓库已包含 `static/CNAME`（内容仅一行：`owovo.xyz`），合并到 `main` 并完成一次成功部署。
2. 仓库 **Settings → Pages → Custom domain** 填：`owovo.xyz` → Save。
3. 等待 **DNS check** 通过。若一直失败：
   - 把根域 CNAME **暂时改为 DNS only（灰云）**，等 GitHub 勾选通过后再改回 **Proxied**；
   - 或按 GitHub 提示添加验证用 TXT，验证完可删。
4. 勾选 **Enforce HTTPS**（证书由 GitHub 为自定义域签发；Cloudflare 到源站用 Full，见下节）。

Hugo 的 `baseURL` 已是 `https://owovo.xyz`，**不要**改成 `*.github.io`。

---

## 4. SSL / TLS（必做）

Cloudflare → **SSL/TLS**：

| 项              | 建议值                                                       |
| --------------- | ------------------------------------------------------------ |
| Encryption mode | **Full**（推荐 **Full (strict)**：源站证书有效且域名匹配时） |
| 不要用          | **Flexible**（浏览器 HTTPS、回源 HTTP，易异常）              |

**SSL/TLS → Edge Certificates**：

- Always Use HTTPS：**On**
- Automatic HTTPS Rewrites：**On**（可选）
- Minimum TLS Version：1.2
- TLS 1.3：**On**

若 Full (strict) 报错 526：先改 **Full**，确认 GitHub 上该自定义域 HTTPS 正常后，再试 Full (strict)。

---

## 5. 缓存规则（提升二次访问）

本站 CSS/JS 经 Fingerprint，字体与图标路径稳定，适合长缓存；**HTML 宜短缓存**，避免改文后长时间旧页。

Cloudflare → **Caching → Cache Rules**（免费档可用），建议建两条（顺序：静态在前）。

### 规则 1：静态资源长缓存

- **Name**：`owovo-static-long-cache`
- **When**（表达式示例）：

```txt
(http.host eq "owovo.xyz" and (
  starts_with(http.request.uri.path, "/css/") or
  starts_with(http.request.uri.path, "/js/") or
  starts_with(http.request.uri.path, "/fonts/") or
  starts_with(http.request.uri.path, "/icons/") or
  starts_with(http.request.uri.path, "/images/") or
  starts_with(http.request.uri.path, "/pagefind/") or
  starts_with(http.request.uri.path, "/love/")
))
```

- **Then**：
  - Cache eligibility：**Eligible for cache**
  - Edge TTL：**1 month**（或更长）
  - Browser TTL：**Respect origin** 或 **1 day**（有 hash 的资源也可更长）

### 规则 2：HTML 短缓存

- **Name**：`owovo-html-short-cache`
- **When**：

```txt
(http.host eq "owovo.xyz" and (
  http.request.uri.path eq "/" or
  ends_with(http.request.uri.path, "/") or
  ends_with(http.request.uri.path, ".html")
))
```

- **Then**：
  - Cache eligibility：**Eligible for cache**
  - Edge TTL：**2 hours**（发文频繁可改为 30 minutes～1 hour）
  - 或 **Bypass cache**（最省心、源站压力略高）

发版后若立刻要全球看到新 HTML：**Caching → Configuration → Purge Cache → Purge Everything**（或按 URL 清）。

---

## 6. 建议开启 / 建议关闭

**建议开：**

- **Speed → Optimization**：Brotli（通常默认）
- **Network**：HTTP/2、HTTP/3 (QUIC)、0-RTT（按需）
- **Caching → Configuration**：Caching Level **Standard**；Browser Cache TTL 可 **Respect Existing Headers**

**建议关或慎用：**

- **Auto Minify**（JS/CSS/HTML）：与已 minify + SRI（`integrity`）可能冲突，**保持关闭**
- **Rocket Loader**：可能干扰主题/模块脚本，**关闭**
- **Email Address Obfuscation / Injected content**：易改 HTML，个人站建议关
- 免费计划下的「伪中国加速」类市场应用：勿轻信，且可能违反 ToS

**Security（按需）：**

- Bot Fight Mode：可开；若误伤再关
- 不必为静态博客强上 WAF 付费规则

---

## 7. 验收清单

在浏览器无痕窗口访问 `https://owovo.xyz`：

1. 证书颁发者含 **Cloudflare** 或 Google Trust（经 CF 边缘）。
2. 响应头有 `cf-ray`（表示走了 Cloudflare）。
3. 静态文件（如 `/css/main.min.*.css`）二次刷新时 `cf-cache-status: HIT`（规则生效后）。
4. 改一篇小文推送 `main`，等 Actions 完成后，必要时 Purge，确认首页摘要已更新。
5. 用手机流量再打开一次，对比接入前的体感（预期：更少超时，而非「国内秒开」）。

本机快速检查（PowerShell）：

```powershell
# 是否经 Cloudflare（应看到 cloudflare 相关头）
curl.exe -sI https://owovo.xyz | findstr /i "cf-ray server cache"

# 静态资源缓存状态（第二次请求常见 HIT）
curl.exe -sI https://owovo.xyz/css/ 2>$null
```

---

## 8. 常见问题

| 现象                        | 处理                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| GitHub Pages DNS check 失败 | 根域先 **灰云** 验证，通过后再 **橙云**                                |
| 错误 526                    | SSL 改为 **Full**；确认 Pages Enforce HTTPS 与自定义域证书就绪         |
| 错误 521 / 522              | 源站 GitHub 故障或 DNS 指错；检查 CNAME 是否为 `<user>.github.io`      |
| 改站后仍是旧页面            | Purge Cache；检查 HTML 规则 Edge TTL 是否过长                          |
| 样式/脚本报 SRI 失败        | 关闭 Auto Minify / Rocket Loader，再硬刷新                             |
| `www` 打不开                | 补 `www` CNAME + 301 到根域，并在 Pages 考虑同时添加 www（或只做跳转） |

---

## 9. 回滚

1. Cloudflare 将 `@` / `www` 改为 **DNS only**，或改回注册商 NS。
2. DNS 按 [GitHub Pages 自定义域名文档](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site) 直连 GitHub。
3. 仓库可保留 `static/CNAME`，不影响直连。

---

## 10. 预期与边界

- **能改善**：TLS 终结在边缘、静态 HIT、减少部分直连 GitHub 的抖动、HTTPS 与压缩统一。
- **不能保证**：全国任意运营商都快；无备案就不能用国内牌照 CDN 做合规「国内加速」。
- **站点内仍值得做**（与 CF 互补）：减少 shields 等大陆慢外链、控制字体体积——见站点性能讨论，不在本文展开。
