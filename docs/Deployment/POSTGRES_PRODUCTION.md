# PostgreSQL Production (VPS)

## Role

Authoritative store for catalog, inventory, orders, payments, webhooks. **Not Redis.**

## Compose

Service `postgres` in `docker-compose.production.yml`:

- Image: `pgvector/pgvector:pg16`
- Volume: `buyingbot_prod_pg_data`
- **No published host port**
- Healthcheck: `pg_isready`
- `restart: unless-stopped`
- TZ via `TZ` / `PGTZ`

## Connection

Apps use Compose-injected:

```
DATABASE_URL=postgresql://USER:PASSWORD@postgres:5432/DB?schema=public&connection_limit=20
```

## Migrations

One-shot `migrate` service runs `prisma migrate deploy` before API becomes healthy.

Manual:

```bash
docker compose -f infrastructure/docker/compose/docker-compose.production.yml \
  --env-file /etc/buyingbot/env.production run --rm migrate
```

## Backup / restore

- Backup: `infrastructure/scripts/backup-postgres.sh` or `backup-postgres-encrypted.sh`
- Restore: `infrastructure/scripts/restore-postgres.sh`
- **Offsite copy required** — same-VPS retention is not DR

## Security

- Strong `POSTGRES_PASSWORD` from secrets file
- UFW: do not allow 5432
- Never commit credentials

## Troubleshooting

| Symptom           | Check                                                       |
| ----------------- | ----------------------------------------------------------- |
| API can't connect | `docker compose ps postgres`, health, password URL-encoding |
| Migrate fails     | Logs on `migrate` container; schema drift                   |
| Disk full         | `df -h`; volume prune never on prod without backup          |
