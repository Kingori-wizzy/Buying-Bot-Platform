# M22 restore drill template

**Date:** 2026-08-13  
**Environment:** local docker compose (`infrastructure/docker/compose`)  
**Operator:** platform agent (dry-run evidence)

## Objectives

- Prove backup/restore scripts exist and are executable.
- Document RPO ≤ 24h and RTO ≤ 4h as **targets** (not measured SLOs).
- Optionally verify a restore against local compose.

## Checklist

| Step                                                            | Result                                            |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `backup-postgres.sh` present                                    | VERIFIED (file exists)                            |
| `backup-postgres.ps1` present                                   | VERIFIED (file exists)                            |
| `restore-postgres.sh` present                                   | VERIFIED (file exists)                            |
| `restore-postgres.ps1` present                                  | VERIFIED (file exists)                            |
| Runbook `docs/Deployment/runbooks/backup-restore.md`            | VERIFIED                                          |
| Outbox requeue helper `requeueFailedOutbox`                     | VERIFIED (code)                                   |
| Production boot refuses missing `SESSION_SECRET`/`DATABASE_URL` | VERIFIED (apiEnvSchema staging/production refine) |

## Dry-run evidence

Scripts and runbooks were added under `infrastructure/scripts/` and
`docs/Deployment/runbooks/`. A full destructive restore against a populated
compose volume was **not** executed in this milestone pass to avoid wiping
developer state without an explicit operator request.

**Status:** DRY-RUN DOCUMENTED — targets remain RPO≤24h / RTO≤4h.  
If an operator later completes a successful compose restore, update this file
to **VERIFIED locally** with timestamp and dump filename.

## Sign-off

- [x] Dry-run documentation complete for M22
- [ ] Live restore drill (optional / operator)
