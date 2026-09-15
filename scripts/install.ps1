# meow-memorycarry 安装脚本:把 skills 与 commands 复制到指定仓库的 .zcode/ 下(幂等,可重复执行)
# 用法(Windows PowerShell 5.1+):
#   powershell -ExecutionPolicy Bypass -File scripts/install.ps1 [-Target <仓库根>]
param(
    [string]$Target = (Resolve-Path "$PSScriptRoot\..\..\..").Path
)

$ErrorActionPreference = "Stop"
$Src = Resolve-Path "$PSScriptRoot\.."
$Dest = Join-Path $Target ".zcode"

if (-not (Test-Path $Dest)) {
    Write-Error "目标仓库不存在 .zcode 目录:$Dest"
}

# meow-handoff 技能:SKILL.md + 规范文档 + 初始化模板,保证技能自包含
$handoffDst = Join-Path $Dest "skills\meow-handoff"
New-Item -ItemType Directory -Force -Path "$handoffDst\docs", "$handoffDst\templates" | Out-Null
Copy-Item "$Src\skills\meow-handoff\SKILL.md" $handoffDst -Force
Copy-Item "$Src\docs\format-spec.md" "$handoffDst\docs\" -Force
Copy-Item "$Src\templates\*" "$handoffDst\templates\" -Force
Write-Host "installed skill: $handoffDst"

# meow-recall 技能:仅 SKILL.md
$recallDst = Join-Path $Dest "skills\meow-recall"
New-Item -ItemType Directory -Force -Path $recallDst | Out-Null
Copy-Item "$Src\skills\meow-recall\SKILL.md" $recallDst -Force
Write-Host "installed skill: $recallDst"

# 短名命令入口
New-Item -ItemType Directory -Force -Path "$Dest\commands" | Out-Null
Copy-Item "$Src\commands\handoff.md", "$Src\commands\recall.md" "$Dest\commands\" -Force
Write-Host "installed commands: $(Join-Path $Dest 'commands')"

Write-Host "`n完成。在 ZCode 会话中使用 /handoff 与 /recall;记忆库 .zcode/memory/ 将在首次 /handoff 时自动初始化。"
