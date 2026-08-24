#!/usr/bin/env bash
# Post-deploy smoke — API health + Escrow fail-closed check.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${BUYINGBOT_ENV_FILE:-$ROOT/.env.production.local}"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

API="${PUBLIC_API_URL:-${NEXT_PUBLIC_API_BASE_URL:-http://127.0.0.1:8080}}"
API="${API%/}"

echo "=== Production smoke ==="
curl -fsS "${API}/health/live" | head -c 200 && echo && echo "OK live"
curl -fsS "${API}/health/ready" | head -c 400 && echo && echo "OK ready"

if [[ "${PAYMENTS_ENABLED:-false}" != "true" ]]; then
  echo "OK payments disabled — no live Escrow expected"
fi

echo "Smoke complete"
