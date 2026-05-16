#requires -Version 5.0
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " no-npm skill + hook - Windows uninstaller" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$ClaudeDir = Join-Path $HOME '.claude'
$SkillDir  = Join-Path $ClaudeDir 'skills\no-npm'
$HookFile  = Join-Path $ClaudeDir 'hooks\block-npm.js'

Write-Host "[1/2] Removing hook entry from settings.json"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  - WARN: Node.js not found - settings.json not updated." -ForegroundColor Yellow
    Write-Host "          Remove the block-npm.js entry from PreToolUse manually." -ForegroundColor Yellow
} else {
    & node (Join-Path $ScriptDir 'uninstall-hook.js')
}

Write-Host "[2/2] Removing files"
if (Test-Path $SkillDir) { Remove-Item -Recurse -Force $SkillDir; Write-Host "  - removed $SkillDir" }
if (Test-Path $HookFile) { Remove-Item -Force $HookFile;            Write-Host "  - removed $HookFile" }

Write-Host ""
Write-Host "Done. Restart Claude Code." -ForegroundColor Green
Write-Host ""
