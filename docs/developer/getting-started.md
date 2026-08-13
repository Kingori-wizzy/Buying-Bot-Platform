# Developer getting started

**Authority:** Accepted ADRs + this repo’s tooling pins.  
**Docs index:** [DOCUMENTATION_BASELINE.md](../DOCUMENTATION_BASELINE.md)

## Tooling versions (required)

| Tool     | Version          | Source                                                    |
| -------- | ---------------- | --------------------------------------------------------- |
| Node.js  | **22** (major)   | `.nvmrc`, `package.json` `engines`, Docker `NODE_VERSION` |
| pnpm     | **9.15.9**       | `packageManager` field + Corepack                         |
| Lockfile | `pnpm-lock.yaml` | Authoritative — use frozen installs in CI                 |

Do not use Node 20 for this workspace. CI and Docker use Node 22.

### Windows (nvm-windows)

```powershell
nvm install 22
nvm use 22
# Ensure C:\nvm4w\nodejs is on PATH (nvm symlink)
node -v   # expect v22.x
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

### macOS / Linux (nvm or fnm)

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

## Install

```bash
pnpm install --frozen-lockfile   # CI / clean machines
# or
pnpm install                     # local after lockfile changes
```

Copy environment template:

```bash
cp .env.example .env
```

Never commit `.env` or real secrets.

## Quality commands (root)

| Command                 | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `pnpm run format:check` | Prettier                                         |
| `pnpm run lint`         | ESLint (max-warnings=0)                          |
| `pnpm run typecheck`    | Turbo typecheck                                  |
| `pnpm run test`         | Turbo Vitest                                     |
| `pnpm run build`        | Turbo build                                      |
| `pnpm run audit:deps`   | `pnpm audit --audit-level=high`                  |
| `pnpm run verify`       | format → lint → typecheck → test → build → audit |
| `pnpm run check:node`   | Fail if Node major ≠ 22                          |

## Local data plane (Postgres + Redis)

Postgres image is **`pgvector/pgvector:pg16`** (vector extension for RAG).

```bash
docker compose -f infrastructure/docker/compose/docker-compose.yml up -d postgres redis
```

If `CREATE EXTENSION vector` fails on an old Alpine volume:

```bash
docker compose -f infrastructure/docker/compose/docker-compose.yml down
docker volume rm buyingbot_pg_data   # name may be prefixed by project
docker compose -f infrastructure/docker/compose/docker-compose.yml up -d postgres redis
```

Default local URLs (see `.env.example`):

- `DATABASE_URL=postgresql://buyingbot:buyingbot@127.0.0.1:5433/buyingbot?schema=public` (host port **5433** → container 5432)
- `DATABASE_URL_TEST=postgresql://buyingbot:buyingbot@127.0.0.1:5433/buyingbot_test?schema=public`
- `REDIS_URL=redis://127.0.0.1:6379`

Create schemas + migrate:

```bash
psql "$DATABASE_URL" -c 'CREATE SCHEMA IF NOT EXISTS ai;'
psql "$DATABASE_URL" -c 'CREATE SCHEMA IF NOT EXISTS notifications;'
# (identity/commerce schemas created by migrations)
pnpm --filter @buying-bot/database exec prisma migrate deploy
```

## AI service

```bash
# Terminal: API on :3000, AI on :3003
pnpm --filter @buying-bot/ai-service start
```

Use `AI_PROVIDER=deterministic` locally without vendor keys. Storefront helper:
`apps/web` → `/assistant` calls `POST /v1/ai/chat`.

## Perf (aspirational)

```bash
k6 run -e BASE_URL=http://127.0.0.1:3000 infrastructure/perf/k6/catalog-read.js
k6 run -e BASE_URL=http://127.0.0.1:3000 infrastructure/perf/k6/checkout-smoke.js
```

Thresholds are **ASPIRATIONAL** (ADR-0020).

## Docker (ops apps)

```bash
docker compose -f infrastructure/docker/compose/docker-compose.yml build api
docker compose -f infrastructure/docker/compose/docker-compose.yml up api
```

Images are multi-stage, non-root, with `/health/live` HEALTHCHECK. Do not bake secrets into images.

## Frontends (M13 / M14)

With the API running on `:3000` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`:

```bash
pnpm --filter @buying-bot/web dev      # storefront → http://localhost:3001
pnpm --filter @buying-bot/admin dev    # admin → http://localhost:3004
```

Both apps call Nest directly via `@buying-bot/sdk` (cookie credentials + CSRF).
Ensure `CORS_ORIGIN` includes both origins (see `.env.example`).

## Database package (from M3)

```bash
pnpm --filter @buying-bot/database exec prisma migrate deploy
pnpm --filter @buying-bot/database exec prisma generate
```

## CI expectations

GitHub Actions (`.github/workflows/ci.yml`): frozen install → gitleaks → format → build → lint → typecheck → test → audit. Do not weaken gates.

## Architecture docs

Start at [DOCUMENTATION_BASELINE.md](../DOCUMENTATION_BASELINE.md). Implementation order: milestones M1–M25 in `docs/project/milestones.md`.
