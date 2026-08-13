# Production Docker Compose (template)

**ADR-0019:** Compose-first. Do **not** put real secrets in this file.

```bash
cp .env.production.example .env.production   # create from staging example; fill via secrets manager
# Set strong unique secrets offline — never commit .env.production
docker compose -f infrastructure/docker/compose/docker-compose.staging.yml \
  --env-file .env.production up -d --build
```

Production differs from staging by:

| Concern            | Requirement                                        |
| ------------------ | -------------------------------------------------- |
| `NODE_ENV`         | `production`                                       |
| Secrets            | From secrets manager / host env — not git          |
| `PAYMENTS_ENABLED` | `false` until EXTERNAL M-Pesa + legal gates        |
| TLS                | Terminated at EXTERNAL load balancer / nginx certs |
| Backups            | Scheduled `backup-postgres` + offsite copy         |
| Seeds              | **Never** run `seed-staging` in production         |

Use the staging compose topology at smaller/equal scale; swap image tags to release versions from GHCR after `staging-deploy.yml` push.
