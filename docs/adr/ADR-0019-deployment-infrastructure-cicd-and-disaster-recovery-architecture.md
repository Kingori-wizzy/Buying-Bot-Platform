# ADR-0019: Deployment, infrastructure, CI/CD, and disaster recovery architecture

- Status: **Accepted**
- Date: 2026-08-13
- Deciders: Platform Architecture; accepted by architecture program review on
  2026-08-13
- Aligns with: ADR-0001 monorepo, ADR-0003 quality gates, ADR-0006 data/DR,
  ADR-0017 observability
- Scope: Environments, containers, CI/CD, migrations, scaling, backups, RPO/
  RTO, secrets, rollout strategy
- Out of scope: Provisioning cloud accounts; writing Terraform in this ADR;
  deploying production

## 1. Context / Problem

Independently deployable apps need a simple, safe path to production without
premature Kubernetes complexity, while meeting ADR-0006 backup expectations
before real payments.

## 2. Decision

**v1:** containerize each deployable (Docker) behind a reverse proxy with
TLS; run API, worker, ai-service, web, admin as separate services; managed
PostgreSQL + Redis + S3-compatible storage.

**Orchestration:** Docker Compose / single-node or simple VM/container host
is sufficient for early staging. Introduce **Kubernetes (or equivalent) only
when** multi-node scheduling, self-healing at scale, or multi-region needs
are proven — via a future infra ADR amendment.

## 3. Environments

| Env | Purpose |
| --- | --- |
| local | Developer machines; docker dependencies |
| development | Shared optional |
| test/CI | Ephemeral PG for migrations/tests |
| staging | Production-like; no real customer money |
| production | Live |

Parity: staging ≈ production topology at smaller scale.

## 4. Deployables

`apps/web`, `apps/admin`, `apps/api`, `apps/worker`, `apps/ai-service`,
`apps/docs` — independently buildable/deployable (ADR-0001).

CDN for public catalog assets/frontend static where applicable (ADR-0009).

## 5. CI/CD (GitHub Actions)

Pipeline: install frozen lockfile → lint → typecheck → unit/integration →
security audit/secret scan → build images → push → deploy staging →
migrations → smoke → (gated) production.

PR checks required (ADR-0003). No secrets in logs. Dependency + container
scanning.

## 6. Migrations

Prisma Migrate forward-only in production (ADR-0006). Backup before prod
migrate. Expand/contract for compatibility. Never `migrate down` in prod.

## 7. Rollout

Prefer **rolling** deployments for API/worker. Blue/green optional later.
Rollback: previous image + forward-fix migrations if needed. Workers
drain gracefully.

## 8. Scaling

Stateless API/ai horizontal scale. Worker concurrency tuned. PG vertical/
read replicas when measured (ADR-0006). Redis scale when saturation.

Autoscaling: CPU/RPS based when host platform supports; not mandatory day 1.

## 9. Secrets & config

Env + secret manager; `.env.example` only. Never commit secrets. Separate
credentials per environment.

## 10. Disaster recovery

| Metric | Pre-payments foundation | Before production payments |
| --- | --- | --- |
| RPO | Align ADR-0006 (≤24h until tightened) | Tighten toward ≤1h (target; verify) |
| RTO | ≤4h aspirational until drill-proven | Drill-proven target |

**Mandatory:** restore drills before declaring DR production-ready and before
real customer payments. Backups: PG PITR when available; object storage
versioning; Redis not commerce restore source.

Failover: documented runbook; multi-AZ when cloud allows.

## 11. TLS / edge

Terminate TLS at reverse proxy/load balancer. HSTS in prod (ADR-0008
headers). WAF optional later.

## 12. Alternatives rejected

K8s-from-day-one without need; snowflake servers without images; shared
prod/staging DB; skipping restore drills; Redis-backed “backup” of orders.

## 13. Future

Multi-region, advanced mesh/mTLS, full IaC modules — amend when justified.

## 14. Decision status

**Accepted.** Indexed in [DECISIONS.md](../DECISIONS.md).
