# Infrastructure design

**Aligns with:** ADR-0019, 0006, existing Docker/CI

## Environments

local, test/CI, staging, production.

## Runtime

- Docker images for api/worker/ai-service (exist as foundation)
- web/admin/docs as Node/Next containers or platform hosting later
- Reverse proxy + TLS termination
- Managed PostgreSQL, Redis, S3-compatible storage
- BullMQ on Redis
- **Kubernetes deferred** until scale evidence

## CI/CD

GitHub Actions: lint, typecheck, test, audit, gitleaks, build. Deploy gated;
no auto-prod deploy assumed.

## Migrations

Prisma Migrate forward-only in prod; backup before migrate.

## DR

RPO≤24h / RTO≤4h foundation; tighten + restore drills before payments.
Redis not restore source for commerce.

## Status vs repo

Docker/Compose/CI foundation **partially implemented**. Full staging/prod
pipelines, secret manager, PITR drills = **PLANNED**.
