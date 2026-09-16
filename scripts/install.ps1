# meow-memorycarry-zcode 安装脚本:把技能与命令安装到目标仓库的 .zcode/ 下(幂等,可重复执行)
# 用法(Windows PowerShell 5.1+):
#   powershell -ExecutionPolicy Bypass -File scripts/install.ps1 [-Target <仓库根或用户目录>]
# 默认安装到当前目录;目标目录没有 .zcode 时会自动创建。
# 用户级安装(所有仓库全局可用):powershell -ExecutionPolicy Bypass -File scripts/install.ps1 -Target $env:USERPROFILE
param(
    [string]$Target = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$Src = Resolve-Path "$PSScriptRoot\.."

if (-not (Test-Path $Target)) {
    Write-Error "目标路径不存在:$Target"
}

$Dest = Join-Path $Target ".zcode"
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# 技能目录自包含(SKILL.md + docs/format-spec.md + templates/),整目录复制
foreach ($name in @("meow-handoff", "meow-recall")) {
    $dst = Join-Path $Dest "skills\$name"
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    Copy-Item "$Src\skills\$name\*" $dst -Recurse -Force
    Write-Host "installed skill: $dst"
}

New-Item -ItemType Directory -Force -Path "$Dest\commands" | Out-Null
Copy-Item "$Src\commands\handoff.md", "$Src\commands\recall.md" "$Dest\commands\" -Force
Write-Host "installed commands: $(Join-Path $Dest 'commands')"

Write-Host "`n完成。在 ZCode 会话中使用 /handoff 与 /recall;记忆库 .zcode/memory/ 将在首次 /handoff 时自动初始化。"
