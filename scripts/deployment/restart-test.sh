#!/usr/bin/env bash
# Restart recovery test — data volumes must survive down/up.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${BUYINGBOT_ENV_FILE:-$ROOT/.env.production.local}"
COMPOSE="$ROOT/infrastructure/docker/compose/docker-compose.production.yml"

echo "=== Restart test ==="
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" down
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" up -d
sleep 20
bash "$ROOT/scripts/vps/monitor-health.sh"
echo "OK restart test finished — verify catalog/orders manually if stack was seeded"
