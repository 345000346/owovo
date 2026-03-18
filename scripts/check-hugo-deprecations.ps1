$ErrorActionPreference = "Stop"

$output = hugo --logLevel info 2>&1
$deprecated = $output | Select-String -Pattern "deprecated:"

if ($deprecated) {
    $deprecated | ForEach-Object { $_.Line }
    throw "检测到 Hugo 弃用日志，请先完成迁移。"
}

Write-Host "未检测到 Hugo 弃用日志。"
