#!/usr/bin/env bash
# Encrypted offsite-ready Postgres backup (gzip + optional age/gpg).
# Usage: ./backup-postgres-encrypted.sh /var/backups/buyingbot
set -euo pipefail
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PLAIN="${OUT_DIR}/buyingbot-${STAMP}.sql.gz"
ENC="${PLAIN}.age"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Dumping to ${PLAIN}"
pg_dump --no-owner --format=plain "$DATABASE_URL" | gzip -c > "$PLAIN"
sha256sum "$PLAIN" > "${PLAIN}.sha256"

if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]] && command -v age >/dev/null; then
  age -r "$BACKUP_AGE_RECIPIENT" -o "$ENC" "$PLAIN"
  rm -f "$PLAIN"
  echo "Encrypted backup: $ENC"
  echo "Copy $ENC and ${PLAIN}.sha256 off-VPS (S3/B2/another host). Do not keep only on this disk."
else
  echo "OK ${PLAIN} (set BACKUP_AGE_RECIPIENT + install age for encryption)"
  echo "CRITICAL: copy this file off the VPS — same-disk-only is not DR."
fi
