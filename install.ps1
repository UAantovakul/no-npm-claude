#requires -Version 5.0
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " no-npm skill + hook - Windows installer" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found in PATH." -ForegroundColor Red
    Write-Host "       Install from https://nodejs.org/ (LTS), then re-run this installer." -ForegroundColor Red
    exit 1
}

$ClaudeDir = Join-Path $HOME '.claude'
$SkillDir  = Join-Path $ClaudeDir 'skills\no-npm'
$HooksDir  = Join-Path $ClaudeDir 'hooks'

Write-Host "[1/4] Creating directories"
New-Item -ItemType Directory -Force -Path $SkillDir | Out-Null
New-Item -ItemType Directory -Force -Path $HooksDir | Out-Null
Write-Host "  - $SkillDir"
Write-Host "  - $HooksDir"

Write-Host "[2/4] Copying files"
Copy-Item -Force (Join-Path $ScriptDir 'payload\skills\no-npm\SKILL.md') (Join-Path $SkillDir 'SKILL.md')
Copy-Item -Force (Join-Path $ScriptDir 'payload\hooks\block-npm.js')    (Join-Path $HooksDir 'block-npm.js')
Write-Host "  - $SkillDir\SKILL.md"
Write-Host "  - $HooksDir\block-npm.js"

Write-Host "[3/4] Registering hook in settings.json"
& node (Join-Path $ScriptDir 'install-hook.js')
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: install-hook.js failed" -ForegroundColor Red; exit 1 }

Write-Host "[4/4] Smoke test (verify the hook blocks 'npm install')"
$payload = '{"tool_input":{"command":"npm install"}}'
$null = $payload | & node (Join-Path $HooksDir 'block-npm.js') 2>&1
$code = $LASTEXITCODE
if ($code -eq 2) {
    Write-Host "  - OK: hook returned exit 2 (blocked npm install)" -ForegroundColor Green
} else {
    Write-Host "  - WARN: hook returned exit $code (expected 2)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host " Done. Restart Claude Code so the skill is picked up." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verify after restarting Claude Code:"
Write-Host "  Ask in chat: 'run npm install'"
Write-Host "  Expected:    Claude replies with a BOLD warning and offers 'pnpm install'."
Write-Host ""
Write-Host "Uninstall:  .\uninstall.ps1"
Write-Host ""
