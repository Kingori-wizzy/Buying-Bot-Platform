# M24 restore drill evidence

**Date:** 2026-08-13  
**Environment:** local docker compose Postgres (`127.0.0.1:5433`, db `buyingbot`)  
**Operator:** platform agent (automated M24 pass)

## Procedure executed

1. Backup via `infrastructure/scripts/backup-postgres.ps1` →  
   `backups/buyingbot-20260813T161536Z.sql`
2. Created empty database `buyingbot_restore_drill`
3. Restored dump via `infrastructure/scripts/restore-postgres.ps1`
4. Verified `SELECT COUNT(*) FROM catalog.products;` → **4**

## Notes

- Client `pg_dump` emitted `SET transaction_timeout` which the server rejected
  once (`ERROR: unrecognized configuration parameter "transaction_timeout"`).
  Restore continued and completed successfully (schema + data present).
- Dump artifacts are gitignored under `backups/` — not committed.

## Result

**VERIFIED locally** — logical backup/restore to `buyingbot_restore_drill`
succeeded for M24 evidence.

| Metric | Target | Status                                                |
| ------ | ------ | ----------------------------------------------------- |
| RPO    | ≤24h   | Documented (schedule still EXTERNAL for shared hosts) |
| RTO    | ≤4h    | Documented; local restore completed in minutes        |

## Sign-off

- [x] Live restore drill against compose Postgres
- [x] Evidence recorded (this file)
