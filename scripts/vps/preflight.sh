#!/usr/bin/env bash
# VPS preflight — checks secrets file + compose config (no invented credentials).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${1:-${BUYINGBOT_ENV_FILE:-$ROOT/.env.production}}"
COMPOSE="$ROOT/infrastructure/docker/compose/docker-compose.production.yml"

fail() { echo "FAIL: $*" >&2; exit 1; }
ok() { echo "OK: $*"; }

[[ -f "$ENV_FILE" ]] || fail "env file missing: $ENV_FILE (create from .env.production.example; chmod 600)"
[[ -f "$COMPOSE" ]] || fail "compose missing: $COMPOSE"

required=(
  POSTGRES_USER
  POSTGRES_PASSWORD
  REDIS_PASSWORD
  SESSION_SECRET
  SERVICE_JWT_SECRET
  CORS_ORIGIN
  NEXT_PUBLIC_API_BASE_URL
  PUBLIC_WEB_URL
  PUBLIC_ADMIN_URL
  PUBLIC_API_URL
  S3_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY
)
# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

for key in "${required[@]}"; do
  val="${!key:-}"
  [[ -n "$val" ]] || fail "$key is empty in $ENV_FILE"
done

[[ "${#SESSION_SECRET}" -ge 32 ]] || fail "SESSION_SECRET must be >= 32 chars"
[[ "${#SERVICE_JWT_SECRET}" -ge 32 ]] || fail "SERVICE_JWT_SECRET must be >= 32 chars"
[[ "${PAYMENTS_ENABLED:-false}" == "true" ]] && {
  for key in ESCROW_API_KEY ESCROW_API_SECRET ESCROW_BASE_URL ESCROW_WEBHOOK_SECRET; do
    [[ -n "${!key:-}" ]] || fail "$key required when PAYMENTS_ENABLED=true"
  done
}

command -v docker >/dev/null || fail "docker not installed"
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" config >/dev/null
ok "compose config validates"
ok "preflight passed for $ENV_FILE"
