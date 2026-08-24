# Database production setup (PostgreSQL)

## Topology

- Image: `pgvector/pgvector:pg16` (vector + PostgreSQL 16)
- Compose service: `postgres` in `docker-compose.production.yml`
- Named volume: `buyingbot_prod_pg_data`
- **No host port published** — not reachable from the Internet
- Credentials: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from `/etc/buyingbot/env.production`

`DATABASE_URL` for application containers is injected by Compose:

`postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public&connection_limit=20`

## Extensions

CI and production image expect:

- `vector` (pgvector)
- `pg_trgm`
- `unaccent`

Init SQL lives under `infrastructure/docker/compose/postgres-init` if present.

## Migrations

Forward-only:

```bash
docker compose -f infrastructure/docker/compose/docker-compose.production.yml \
  --env-file /etc/buyingbot/env.production up migrate
```

Do **not** run destructive migrate rollback automatically.

Seed: identity/catalog bootstrap that ships with the API is **schema/org defaults**, not fake customer payments.

## Health

Compose healthcheck: `pg_isready`. API `/health/ready` includes a database check.

## Backup / restore

See `docs/Deployment/BACKUP_RESTORE.md`.

## Password rotation

Change `POSTGRES_PASSWORD` in the env file, recreate the postgres container **only with a planned procedure** (existing volume keeps data; role password must be `ALTER USER` inside Postgres). Bootstrap password via `BOOTSTRAP_INFRA_PASSWORD` is for first install only — rotate before go-live.
