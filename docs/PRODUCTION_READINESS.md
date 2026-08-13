# Production readiness checklist

**Scope:** Buying Bot Platform engineering (M1–M25)  
**Last verified:** 2026-08-13  
**Classification:** CONDITIONALLY PRODUCTION READY (see
[project/PRODUCTION_READINESS_REPORT.md](./project/PRODUCTION_READINESS_REPORT.md))

Use this checklist before promoting any environment. Check items only after
evidence. EXTERNAL items remain unchecked by design.

## Repository integrity

- [x] Monorepo workspace (`pnpm-workspace.yaml`) configured
- [x] Lockfile committed (`pnpm-lock.yaml`)
- [x] Secrets patterns ignored (`.gitignore` for `.env`)
- [x] `.env.example` / `.env.staging.example` present (no real secrets)
- [x] No secrets committed (gitleaks in CI)

## Build / quality

- [x] `pnpm run lint` / typecheck / build / test / format:check
- [x] Node engine documented (`.nvmrc` = 22)
- [x] Integrity + API smoke scripts
- [x] Playwright e2e foundation (`pnpm run test:e2e`)

## Security

- [x] Dependency audit in CI
- [x] Dependabot enabled
- [x] Secret scanning in CI (gitleaks)
- [x] Security reporting policy (`SECURITY.md`)
- [x] Authentication implemented (sessions)
- [x] Authorization / RBAC enforced server-side
- [x] Rate limiting (Redis with memory fallback)
- [x] Security headers on product APIs (Helmet)
- [x] Webhook signature verification (payments path)
- [x] AI prompt-injection controls (guardrails)
- [ ] Full secrets manager integration (Vault/SM) — EXTERNAL
- [ ] Formal pen-test — EXTERNAL
- [ ] Live WAF — EXTERNAL

## Configuration

- [x] Typed env validation (`@buying-bot/config`) with fail-fast
- [x] Production/staging forbids wildcard CORS
- [x] Production forbids ephemeral `PORT=0`
- [x] Stack traces disabled on ops errors in production

## Reliability / observability

- [x] Liveness / readiness / health endpoints
- [x] Structured JSON logging with redaction seams
- [x] Request / correlation IDs
- [x] Graceful shutdown (SIGTERM/SIGINT)
- [x] `/metrics` Prometheus text + OTel bootstrap seam
- [ ] Centralized alerting — EXTERNAL
- [ ] SLOs / error budgets measured — ASPIRATIONAL

## Data

- [x] Prisma/PostgreSQL wired + migrations pipeline
- [x] pgvector / search extensions
- [x] Integrity SQL checks
- [x] Backup/restore scripts + local drill evidence path
- [ ] Managed PITR in cloud — EXTERNAL

## Deployment

- [x] Multi-stage Dockerfiles (api/worker/ai + web/admin standalone)
- [x] Local + staging Compose (separate volumes/network)
- [x] Container healthchecks
- [x] Staging GHCR workflow (no prod auto-deploy)
- [ ] Remote staging host secrets — EXTERNAL
- [ ] Kubernetes as runtime — intentionally deferred (ADR-0019)

## AI / integrations

- [x] Model provider ports + deterministic provider
- [x] RAG / pgvector knowledge
- [x] Payment provider adapter with idempotency
- [ ] Live vendor AI keys — EXTERNAL
- [ ] Live M-Pesa production keys — EXTERNAL
- [ ] Omnichannel WhatsApp/Instagram production adapters — EXTERNAL

## Documentation / DR

- [x] ADRs 0001–0020
- [x] Runbooks (deploy/rollback/DR/payments/security/AI/monitoring)
- [x] M24 readiness / RTM / security / compliance docs
- [x] M25 launch checklist + final implementation report
- [ ] Legal/compliance approvals — EXTERNAL

## Rollback strategy (current)

1. Revert the failing git commit / PR on `main`.
2. Redeploy previous container image tag (see ROLLBACK_RUNBOOK).
3. Prefer forward-fix migrations; restore drill DB if required.
