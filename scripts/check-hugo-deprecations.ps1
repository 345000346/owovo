$ErrorActionPreference = "Stop"

# 用更宽的关键词扫描 Hugo 日志，避免只匹配单一文案而漏掉弃用提示。
$output = hugo --gc --minify --logLevel info 2>&1
$deprecated = $output | Select-String -Pattern "(?i)deprecat"

if ($deprecated) {
    $deprecated | ForEach-Object { $_.Line }
    throw "检测到 Hugo 弃用相关日志，请先完成迁移。"
}

Write-Host "未检测到 Hugo 弃用相关日志。"
