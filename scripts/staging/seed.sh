#!/usr/bin/env bash
# Seed identity + staging catalog sample (never for production cutover).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "Refusing to run staging seed with NODE_ENV=production" >&2
  exit 1
fi

echo "Building @buying-bot/database (seed CLI)..."
pnpm --filter @buying-bot/database build

echo "Seeding identity + staging catalog (NODE_ENV=${NODE_ENV:-unset})..."
pnpm --filter @buying-bot/database exec node ./dist/seed-staging-cli.js
echo "OK seed"
