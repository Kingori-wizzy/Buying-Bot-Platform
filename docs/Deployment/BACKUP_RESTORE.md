# Backup and restore

A backup is **not verified** until a restore has been executed against a non-production target (or a controlled drill). This repository provides scripts; offsite credentials are EXTERNAL_PREREQUISITE.

## What to back up

| Asset                | Script                                                | Notes                        |
| -------------------- | ----------------------------------------------------- | ---------------------------- |
| PostgreSQL           | `infrastructure/scripts/backup-postgres.sh`           | gzip SQL                     |
| PostgreSQL encrypted | `infrastructure/scripts/backup-postgres-encrypted.sh` | gzip + optional `age`        |
| MinIO bucket         | `infrastructure/scripts/backup-minio.sh`              | `mc mirror` to offsite alias |
| Env file             | copy `/etc/buyingbot/env.production` off-box          | chmod 600; never commit      |

`deploy-production.sh` takes a **pre-deploy** `pg_dump` via `docker compose exec` when Postgres is already running. It never drops the database.

## Schedule (recommended)

- Postgres: daily (RPO target documented as ≤ 24h)
- MinIO: daily or after large catalog media changes
- Retention: keep ≥ 7 daily + 4 weekly offsite (company policy)

## Encryption

Set `BACKUP_AGE_RECIPIENT` and install `age` for encrypted dumps. Copy `*.sql.gz.age` **off the VPS**.

## Restore (dangerous)

```bash
export DATABASE_URL='postgresql://...'   # target DB only
bash infrastructure/scripts/restore-postgres.sh ./backups/buyingbot-YYYYMMDDT....sql.gz
```

Never point restore at production without change control. After restore: `pnpm run integrity` (or equivalent against that database) and application smoke.

## Verification status

- Scripts exist and are wired into the Hostinger package
- **Live restore drill on Hostinger VPS: BLOCKED BY HUMAN ACTION** (needs VPS + backup file)
