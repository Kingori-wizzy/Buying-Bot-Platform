#!/usr/bin/env bash
# Apply Prisma migrations (deploy) against DATABASE_URL.
# Prefer staging DATABASE_URL from `.env.staging` when present.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f .env.staging ]] && [[ -z "${DATABASE_URL:-}" ]]; then
  # shellcheck disable=SC1091
  set -a
  # Load only DATABASE_URL-ish lines safely is hard; require export or use --env-file pattern.
  # Operators should: export $(grep -v '^#' .env.staging | xargs) or set DATABASE_URL explicitly.
  echo "Tip: export DATABASE_URL from .env.staging before running (do not source secrets into shells carelessly)."
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Creating schemas if missing (idempotent)..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' || true
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS promotions;
CREATE SCHEMA IF NOT EXISTS cart;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS integrations;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
SQL

echo "prisma migrate deploy..."
pnpm --filter @buying-bot/database exec prisma migrate deploy
echo "OK migrate deploy"
