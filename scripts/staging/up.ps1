#Requires -Version 5.1
<#
.SYNOPSIS
  Bring up the staging Compose stack (ADR-0019 Compose-first).
.NOTES
  Does not deploy to a remote host. EXTERNAL: fill `.env.staging` first.
#>
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

$envFile = Join-Path $Root ".env.staging"
if (-not (Test-Path $envFile)) {
  Write-Host "Missing .env.staging — copy .env.staging.example and fill EXTERNAL placeholders."
  exit 1
}

$compose = "infrastructure/docker/compose/docker-compose.staging.yml"
Write-Host "Starting staging stack from $compose"
docker compose -f $compose --env-file $envFile up -d --build @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$httpPort = if ($env:STAGING_HTTP_PORT) { $env:STAGING_HTTP_PORT } else { "8080" }
Write-Host "Staging stack requested. Check: docker compose -f $compose ps"
Write-Host "HTTP (local): http://127.0.0.1:$httpPort"
