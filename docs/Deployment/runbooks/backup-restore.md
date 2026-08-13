# Backup / restore runbook (ADR-0019)

## Scope

Logical PostgreSQL backups for Buying Bot Platform local/staging/production
data stores. Redis is ephemeral cache/rate-limit and is **not** the system of
record.

## Targets (documented)

| Metric | Target     | Status                              |
| ------ | ---------- | ----------------------------------- |
| RPO    | ≤ 24 hours | Documented (schedule daily backups) |
| RTO    | ≤ 4 hours  | Documented (restore + smoke)        |

## Prerequisites

- `pg_dump` / `psql` client tools
- `DATABASE_URL` pointing at the target instance
- Local compose uses host port **5433** → container 5432

Example:

```bash
export DATABASE_URL='postgresql://buyingbot:buyingbot@127.0.0.1:5433/buyingbot'
```

## Backup

```bash
./infrastructure/scripts/backup-postgres.sh ./backups
# Windows:
# .\infrastructure\scripts\backup-postgres.ps1 -OutDir .\backups
```

Store artifacts off-box (object storage) in real environments. Do not commit
dumps to git.

## Restore

```bash
./infrastructure/scripts/restore-postgres.sh ./backups/buyingbot-TIMESTAMP.sql.gz
```

After restore:

1. `pnpm --filter @buying-bot/database exec prisma migrate deploy`
2. Smoke: `GET /health/ready` on api/worker/ai-service
3. Login + catalog read + cart add

## Connection pool note

Tune Prisma/Postgres via `DATABASE_URL` query params, e.g.:

`?connection_limit=10&pool_timeout=30`

Avoid unbounded connection growth under k6 load.

## Outbox recovery

Failed outbox rows can be requeued via worker periodic `requeueFailedOutbox`
or admin `POST /v1/admin/outbox/reprocess` (system:manage).
