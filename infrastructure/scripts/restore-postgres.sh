#!/usr/bin/env bash
# Restore PostgreSQL from a gzipped SQL dump produced by backup-postgres.sh.
# DANGEROUS: overwrites the target database. Never run against production without change control.
# Usage: ./restore-postgres.sh ./backups/buyingbot-YYYYMMDD.sql.gz
set -euo pipefail

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Restoring ${DUMP} into DATABASE_URL (this will apply SQL against the target DB)"
gunzip -c "$DUMP" | psql "$DATABASE_URL"
echo "Restore complete. Verify with application smoke tests. RTO target: <= 4h."
