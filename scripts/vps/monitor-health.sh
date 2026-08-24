#!/usr/bin/env bash
# Lightweight VPS health probe for Docker Compose production stack.
set -euo pipefail
COMPOSE="${COMPOSE_FILE:-infrastructure/docker/compose/docker-compose.production.yml}"
ENV_FILE="${BUYINGBOT_ENV_FILE:-.env.production}"
API_PUBLIC="${API_PUBLIC_URL:-https://api.example.com}"

echo "=== docker compose ps ==="
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" ps || true

echo "=== container health ==="
for s in postgres redis minio api worker ai-service web admin nginx; do
  cid="$(docker compose -f "$COMPOSE" --env-file "$ENV_FILE" ps -q "$s" 2>/dev/null || true)"
  if [[ -z "$cid" ]]; then
    echo "MISSING $s"
    continue
  fi
  st="$(docker inspect -f '{{.State.Health.Status}}{{if not .State.Health}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo unknown)"
  echo "$s: $st"
done

echo "=== disk ==="
df -h / | tail -1

echo "=== public API live (if DNS/TLS ready) ==="
curl -fsS --max-time 10 "${API_PUBLIC}/health/live" && echo || echo "API_PUBLIC probe skipped/failed (EXTERNAL DNS/TLS may be pending)"
