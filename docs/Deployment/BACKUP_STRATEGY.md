# Backup Strategy

## PostgreSQL (authoritative)

Daily (or more):

1. `backup-postgres-encrypted.sh` → gzip (+ age if configured)
2. SHA-256 sidecar
3. **Copy off VPS** (object storage / second host / B2)

Retention: keep ≥7 daily + ≥4 weekly (adjust per RPO/RTO).

Restore: `restore-postgres.sh` after stopping writers; run integrity check.

## MinIO

`backup-minio.sh` mirrors bucket to offsite `mc` alias.

## Redis

AOF on volume — rebuildable from Postgres for commerce truth; do not treat Redis as DR source.

## Test

Quarterly restore drill (see `docs/Deployment/drills/`).

## Rule

**Same-disk-only backups = NOT production DR.**
