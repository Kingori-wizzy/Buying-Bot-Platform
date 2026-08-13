# Rollback runbook

## When to rollback

- SEV-1/2 after a deploy (error rate, payment failures, data corruption risk)
- Failed smoke/integrity after migrate (prefer forward-fix if migration applied)

## Image rollback (Compose)

1. Identify last known good tag (`sha-…` or semver) from GHCR / `artifacts/BUILD_METADATA.json`.
2. On host, set image tags in compose override or pull previous digests.
3. `docker compose … up -d` for api/worker/ai-service/web/admin.
4. Confirm `/health/ready` and smoke.

## Migration rollback

- **Do not** run `prisma migrate down` in staging/production.
- Prefer forward-fix migration.
- If unblock requires restore: use [DATABASE_RECOVERY.md](./DATABASE_RECOVERY.md).

## Frontend rollback

Redeploy previous `buying-bot-web` / `buying-bot-admin` image tags. CDN cache
purge is EXTERNAL when CDN is enabled.

## Communication

Announce rollback in incident channel; link to [incident-response.md](./incident-response.md).
