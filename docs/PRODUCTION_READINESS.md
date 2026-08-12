# Production readiness checklist

**Scope:** Engineering foundation for Buying Bot Platform  
**Last verified:** 2026-08-12 (local verification run — see report in chat / canvas)  
**Classification target:** Foundation hardening (not full commerce production)

Use this checklist before promoting any environment. Check items only after evidence (command output, config review, or exercise). Do not mark unchecked items as complete.

## Repository integrity

- [x] Monorepo workspace (`pnpm-workspace.yaml`) configured
- [x] Lockfile committed (`pnpm-lock.yaml`)
- [x] Secrets patterns ignored (`.gitignore` for `.env`)
- [x] `.env.example` present (no real secrets)
- [x] No secrets committed (gitleaks in CI + local scan)

## Build / quality

- [x] `pnpm run lint` passes
- [x] `pnpm run typecheck` passes
- [x] `pnpm run build` passes
- [x] `pnpm run test` passes (meaningful unit/integration smoke tests)
- [x] `pnpm run format:check` enforced in CI
- [x] Node engine documented (`.nvmrc` = 22)

## Security

- [x] Dependency audit in CI (`pnpm audit --audit-level=high`)
- [x] Dependabot enabled
- [x] Secret scanning in CI (gitleaks)
- [x] Security reporting policy (`SECURITY.md`)
- [ ] Authentication implemented (contracts only — `@buying-bot/auth`)
- [ ] Authorization / RBAC enforced server-side
- [ ] Rate limiting
- [ ] Security headers on product APIs (ops endpoints set minimal headers)
- [ ] Webhook signature verification
- [ ] AI prompt-injection controls (ports defined — not wired)

## Configuration

- [x] Typed env validation (`@buying-bot/config`) with fail-fast
- [x] Production forbids wildcard CORS
- [x] Production forbids ephemeral `PORT=0`
- [x] Stack traces disabled on ops errors in production
- [ ] Full secrets manager integration (Vault/SM/etc.)

## Reliability / observability

- [x] Liveness endpoint (`/health/live`)
- [x] Readiness endpoint (`/health/ready`)
- [x] Health endpoint (`/health`)
- [x] Structured JSON logging with redaction
- [x] Request / correlation IDs on ops responses
- [x] Graceful shutdown (SIGTERM/SIGINT)
- [ ] OpenTelemetry metrics/traces
- [ ] Centralized alerting
- [ ] SLOs / error budgets

## Data

- [x] Database ports/contracts (`@buying-bot/database`)
- [ ] Prisma/PostgreSQL wired
- [ ] Migrations pipeline
- [ ] Connection pooling
- [ ] Backup strategy exercised (documented only)
- [ ] Point-in-time recovery tested

## Deployment

- [x] Multi-stage Dockerfile (non-root) for Node services
- [x] Compose file for api/worker/ai-service
- [x] Container `HEALTHCHECK`
- [x] Docker image build verified for `api` (`buying-bot-api:pr`)
- [ ] Kubernetes manifests
- [ ] Terraform environments
- [ ] Staging promotion pipeline
- [ ] Production deploy pipeline (intentionally not auto-deploy)
- [ ] Rollback runbook exercised

## AI / integrations

- [x] Model provider port (`@buying-bot/ai-core`)
- [x] High-risk tool approval flags in AI contracts
- [ ] Provider adapters (OpenAI/etc.)
- [ ] RAG / pgvector
- [ ] Omnichannel adapters (WhatsApp/Instagram/TikTok/Email/SMS)
- [ ] Payment provider adapters with idempotency

## Documentation / DR

- [x] Architecture EAD present
- [x] ADRs 0001–0004
- [x] Disaster recovery baseline documented
- [ ] Full BRS/SRS/Security design volumes
- [ ] Restore drill completed (NOT VERIFIED)

## Rollback strategy (current)

1. Revert the failing git commit / PR on `main`.
2. Redeploy previous container image tag.
3. If config-only failure: restore previous env values; restart services.
4. Database rollbacks require forward-fix migrations (no automated down-migrate in prod yet).

## Sign-off

| Gate                     | Owner        | Status                           |
| ------------------------ | ------------ | -------------------------------- |
| Repository integrity     | Engineering  | Pass                             |
| Build integrity          | Engineering  | Pass (verify each release)       |
| Type safety              | Engineering  | Pass                             |
| Code quality             | Engineering  | Pass                             |
| Security (foundation)    | Engineering  | Partial — no AuthN/Z product yet |
| Dependency health        | Engineering  | Pass at last audit               |
| Configuration safety     | Engineering  | Pass for Node ops shells         |
| Testing                  | Engineering  | Pass (foundation coverage)       |
| Runtime reliability      | Engineering  | Pass for ops shells              |
| Observability            | Engineering  | Partial (logs + health)          |
| Deployment readiness     | Engineering  | Partial (Docker only)            |
| Documentation            | Engineering  | Partial                          |
| Disaster recovery        | Engineering  | Documented, not drilled          |
| Architecture consistency | Architecture | Pass (ADR-0004 recorded)         |
