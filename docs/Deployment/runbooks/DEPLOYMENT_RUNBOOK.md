# Deployment runbook (Compose-first, ADR-0019)

## Scope

Deploy Buying Bot Platform to **staging** (or a single-node production-like host)
using Docker Compose. Kubernetes is **not** introduced.

## Prerequisites (EXTERNAL)

- Host with Docker Engine + Compose plugin
- `.env.staging` populated (from `.env.staging.example`) — never commit
- GHCR access to pull `ghcr.io/<owner>/buying-bot-*` images **or** build on host
- DNS + TLS certificates when exposing publicly (see nginx TLS comments)
- Database backup taken before migrate on shared environments

## Local / ephemeral staging

```bash
cp .env.staging.example .env.staging
# edit CHANGE_ME_* values
pnpm run staging:up
# or: bash scripts/staging/up.sh
export DATABASE_URL='postgresql://…@127.0.0.1:5434/buyingbot_staging'
bash scripts/staging/migrate.sh
bash scripts/staging/seed.sh   # never on production
API_BASE_URL=http://127.0.0.1:8080 pnpm run smoke
pnpm run integrity
```

## Image promote (CI)

1. Tag `v*` or run **Staging deploy** workflow (`workflow_dispatch`).
2. Workflow builds/pushes GHCR images when `GITHUB_TOKEN` available.
3. Remote SSH restart only if `STAGING_SSH_HOST` (+ user/key) secrets exist.
4. If secrets missing: images only — operator restarts compose manually.

## Migrations

```bash
pnpm run migrate:deploy
```

Forward-only. Backup first on shared DBs. Never `migrate down` in prod.

## Verification

- `GET /health/live` and `/health/ready`
- `pnpm run smoke` with `SMOKE_REQUIRE=1`
- `pnpm run integrity`
- Optional: Playwright with `API_BASE_URL` / `WEB_BASE_URL`

## Rollback

See [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md).
