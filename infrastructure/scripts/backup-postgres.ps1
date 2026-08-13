# Backup PostgreSQL for Buying Bot Platform (Windows).
# Usage: .\backup-postgres.ps1 [-OutDir .\backups]
param(
  [string]$OutDir = ".\backups"
)

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$file = Join-Path $OutDir "buyingbot-$stamp.sql"

Write-Host "Writing backup to $file"
& pg_dump --no-owner --format=plain $env:DATABASE_URL | Set-Content -Path $file -Encoding utf8
Write-Host "OK $file"
Write-Host "RPO target: <= 24h (documented); schedule at least daily."
