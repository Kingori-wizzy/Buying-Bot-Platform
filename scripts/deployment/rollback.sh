#!/usr/bin/env bash
# Rollback — stop stack, optionally restore DB from latest backup.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${BUYINGBOT_ENV_FILE:-$ROOT/.env.production.local}"
COMPOSE="$ROOT/infrastructure/docker/compose/docker-compose.production.yml"
BACKUP="${1:-}"

echo "=== Rollback: stopping application stack ==="
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" stop api worker web admin ai-service nginx

if [[ -n "$BACKUP" && -f "$BACKUP" ]]; then
  echo "=== Restoring Postgres from $BACKUP ==="
  export DATABASE_URL
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}?schema=public"
  bash "$ROOT/infrastructure/scripts/restore-postgres.sh" "$BACKUP"
fi

echo "=== Rollback complete — restart with deploy-production.sh when ready ==="
