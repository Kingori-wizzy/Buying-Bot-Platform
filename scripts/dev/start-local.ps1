#Requires -Version 5.1
<#
.SYNOPSIS
  Start all Buying Bot Platform services locally with .env loaded.

.DESCRIPTION
  Node does not auto-load `.env`. This script uses `node --env-file=.env` and
  sets per-service PORT / SERVICE_NAME overrides so worker and AI do not
  inherit API PORT=3000.

  Prerequisites:
    docker compose -f infrastructure/docker/compose/docker-compose.yml up -d postgres redis
    pnpm install && pnpm run build --filter=@buying-bot/api --filter=@buying-bot/worker --filter=@buying-bot/ai-service

.NOTES
  Run from repository root. Each service opens in its own minimized window.
#>
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

if (-not (Test-Path (Join-Path $Root ".env"))) {
  Write-Error "Missing .env — copy .env.example to .env first."
}

$node = "node"
if (-not (Get-Command $node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js not found on PATH."
}

Write-Host "Starting Buying Bot Platform (local dev) from $Root"
Write-Host ""
Write-Host "  API          -> http://127.0.0.1:3000"
Write-Host "  Storefront   -> http://127.0.0.1:3001"
Write-Host "  Worker ops   -> http://127.0.0.1:3002"
Write-Host "  AI service   -> http://127.0.0.1:3003"
Write-Host "  Admin        -> http://127.0.0.1:3004"
Write-Host ""

function Start-ServiceWindow {
  param(
    [string]$Title,
    [string]$Command
  )
  Start-Process powershell -WindowStyle Minimized -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Root'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Command"
  ) | Out-Null
  Write-Host "Started $Title"
}

# API — uses PORT=3000 from .env
Start-ServiceWindow "BB API :3000" `
  "node --env-file=.env apps/api/dist/index.js"

Start-Sleep -Seconds 3

# Worker — override PORT and SERVICE_NAME
Start-ServiceWindow "BB Worker :3002" `
  "`$env:PORT='3002'; `$env:SERVICE_NAME='worker'; node --env-file=.env apps/worker/dist/index.js"

# AI service — override PORT and SERVICE_NAME
Start-ServiceWindow "BB AI :3003" `
  "`$env:PORT='3003'; `$env:SERVICE_NAME='ai-service'; node --env-file=.env apps/ai-service/dist/index.js"

Start-Sleep -Seconds 2

# Next.js frontends (read NEXT_PUBLIC_* from shell; turbo loads .env via Next)
Start-ServiceWindow "BB Web :3001" `
  "pnpm --filter=@buying-bot/web dev"

Start-ServiceWindow "BB Admin :3004" `
  "pnpm --filter=@buying-bot/admin dev"

Write-Host ""
Write-Host "All services launching. Wait ~30s for Next.js compile, then open:"
Write-Host "  http://localhost:3001  (storefront)"
Write-Host "  http://localhost:3004  (admin)"
Write-Host ""
Write-Host "Verify API:  curl http://127.0.0.1:3000/health/ready"
Write-Host "Smoke test:  `$env:API_BASE_URL='http://127.0.0.1:3000'; `$env:SMOKE_REQUIRE='1'; node ./scripts/smoke/staging-smoke.mjs"
