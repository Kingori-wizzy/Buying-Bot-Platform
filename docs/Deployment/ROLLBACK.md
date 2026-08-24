# Rollback

## Application rollback (non-destructive)

```bash
export BUYINGBOT_ENV_FILE=/etc/buyingbot/env.production
bash scripts/deployment/rollback.sh
```

Stops `api`, `worker`, `web`, `admin`, `ai-service`, `nginx`. **Does not delete volumes.**

Redeploy a known git SHA, then:

```bash
bash scripts/deployment/deploy-production.sh /etc/buyingbot/env.production
```

## Database restore (destructive — explicit)

Only when a dump path is supplied:

```bash
bash scripts/deployment/rollback.sh /var/backups/buyingbot/pre-deploy-TIMESTAMP.sql.gz
```

Requires `restore-postgres.sh` and a reachable Postgres. **Never automatic.**

Prisma migrate rollback is **not** run by deploy/rollback scripts.

See also `docs/Deployment/runbooks/ROLLBACK_RUNBOOK.md`.
