#!/usr/bin/env bash
# Restore from a plain SQL dump produced by backup-postgres.ps1 on Windows.
# Usage: .\restore-postgres.ps1 -Dump .\backups\buyingbot-....sql
param(
  [Parameter(Mandatory = $true)]
  [string]$Dump
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $Dump)) {
  throw "Dump file not found: $Dump"
}
if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required"
}

Write-Host "Restoring $Dump (dangerous — change-control required for production)"
Get-Content -Path $Dump -Raw | & psql $env:DATABASE_URL
Write-Host "Restore complete. RTO target: <= 4h."
