# Database recovery runbook

Extends [backup-restore.md](./backup-restore.md).

## Backup

```bash
export DATABASE_URL='postgresql://…'
./infrastructure/scripts/backup-postgres.sh ./backups
```

Windows: `.\infrastructure\scripts\backup-postgres.ps1 -OutDir .\backups`

## Restore drill (recommended before payments)

1. Create empty database `buyingbot_restore_drill`.
2. Point `DATABASE_URL` at that database.
3. Restore dump via `restore-postgres.sh` / `.ps1`.
4. `pnpm run migrate:deploy`
5. `pnpm run integrity` and smoke against a temporary API if needed.
6. Record evidence under `docs/Deployment/drills/`.

## Production incident restore

1. Freeze writes / stop api+worker accepting checkouts if corruption suspected.
2. Restore to new instance or PITR (EXTERNAL managed Postgres capability).
3. Validate integrity + smoke.
4. Repoint connection string via secrets manager (EXTERNAL).
5. Post-incident review.

## Redis

Not a restore source for orders/payments. Flush-safe for cache/rate-limit.
