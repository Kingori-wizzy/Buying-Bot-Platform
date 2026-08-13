#!/usr/bin/env bash
# Backup PostgreSQL for Buying Bot Platform (ADR-0019).
# Usage: ./backup-postgres.sh [output-dir]
# Requires: pg_dump, DATABASE_URL or PG* env vars.
set -euo pipefail

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${OUT_DIR}/buyingbot-${STAMP}.sql.gz"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Writing backup to ${FILE}"
pg_dump --no-owner --format=plain "$DATABASE_URL" | gzip -c > "$FILE"
echo "OK ${FILE}"
echo "RPO target: <= 24h (documented); schedule this job at least daily."
