#!/usr/bin/env bash
# Bring up the staging Compose stack (ADR-0019 Compose-first).
# Does not deploy to a remote host. EXTERNAL: fill `.env.staging` first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.staging ]]; then
  echo "Missing .env.staging — copy .env.staging.example and fill EXTERNAL placeholders." >&2
  exit 1
fi

COMPOSE="infrastructure/docker/compose/docker-compose.staging.yml"
echo "Starting staging stack from ${COMPOSE}"
docker compose -f "${COMPOSE}" --env-file .env.staging up -d --build "$@"
echo "Staging stack requested. Check: docker compose -f ${COMPOSE} ps"
echo "HTTP (local): http://127.0.0.1:${STAGING_HTTP_PORT:-8080}"
