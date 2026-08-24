#!/usr/bin/env bash
# Production deployment — Hostinger VPS (Compose-first).
# Never prints secret values. Never drops/restores the database automatically.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${BUYINGBOT_ENV_FILE:-${1:-$ROOT/.env.production.local}}"
COMPOSE="$ROOT/infrastructure/docker/compose/docker-compose.production.yml"
COMPOSE_CMD=(docker compose -f "$COMPOSE" --env-file "$ENV_FILE")

echo "=== Buying Bot production deploy ==="
echo "env file: $ENV_FILE"

command -v docker >/dev/null || { echo "FAIL: docker is not installed" >&2; exit 1; }
docker compose version >/dev/null || { echo "FAIL: docker compose plugin missing" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "FAIL: env file missing: $ENV_FILE" >&2; exit 1; }
[[ -f "$COMPOSE" ]] || { echo "FAIL: compose file missing" >&2; exit 1; }

echo "=== 1. Environment preflight ==="
node "$ROOT/scripts/deployment/production-preflight.mjs" --env-file "$ENV_FILE"

echo "=== 2. Host resources ==="
if command -v df >/dev/null; then
  df -h / | tail -n 1 || true
fi
if command -v free >/dev/null; then
  free -m | head -n 2 || true
fi

echo "=== 3. Ports 80/443 (informational) ==="
if command -v ss >/dev/null; then
  ss -lnt | grep -E ':80|:443' || echo "OK: 80/443 not yet bound (expected before first nginx start)"
fi

echo "=== 4. Existing stack backup (if postgres is already running) ==="
if "${COMPOSE_CMD[@]}" ps --status running postgres 2>/dev/null | grep -q postgres; then
  BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
  mkdir -p "$BACKUP_DIR"
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  DUMP="${BACKUP_DIR}/pre-deploy-${STAMP}.sql.gz"
  echo "Writing pre-deploy dump to $DUMP (no secrets in this message)"
  "${COMPOSE_CMD[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -c > "$DUMP"
  echo "OK pre-deploy backup written"
else
  echo "OK no running postgres — skip pre-deploy dump (fresh install)"
fi

echo "=== 5. Pull/build images ==="
"${COMPOSE_CMD[@]}" build

echo "=== 6. Start data plane ==="
"${COMPOSE_CMD[@]}" up -d postgres redis minio
echo "Waiting for postgres/redis/minio health..."
for i in $(seq 1 40); do
  if "${COMPOSE_CMD[@]}" exec -T postgres pg_isready >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "=== 7. Bucket init + migrations (forward-only; no automatic rollback) ==="
"${COMPOSE_CMD[@]}" up --abort-on-container-exit minio-init migrate

echo "=== 8. Start application stack ==="
"${COMPOSE_CMD[@]}" up -d

echo "=== 9. Wait for health ==="
sleep 12
if [[ -x "$ROOT/scripts/vps/monitor-health.sh" ]]; then
  bash "$ROOT/scripts/vps/monitor-health.sh" || echo "WARN monitor-health reported issues"
fi

echo "=== 10. Smoke ==="
node "$ROOT/scripts/deployment/post-deploy-smoke.mjs" --env-file "$ENV_FILE" || {
  echo "FAIL post-deploy smoke" >&2
  "${COMPOSE_CMD[@]}" ps
  exit 1
}

echo "=== Deploy status ==="
"${COMPOSE_CMD[@]}" ps
echo "OK deploy-production finished"
echo "If PAYMENTS_ENABLED is false, live Escrow remains fail-closed (expected until company credentials)."
