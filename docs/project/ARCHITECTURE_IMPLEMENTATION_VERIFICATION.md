# Architecture Implementation Verification

**Version:** 0.1.0-rc.2  
**Git SHA:** `3b5bb6635ce62e01e056cfd4c7b61d448380e5e7`  
**Verified:** 2026-08-18  
**Scope:** Repository alignment with ADR-0005 through ADR-0020

---

## Methodology

Inspected `apps/*`, `packages/*`, `infrastructure/*`, `scripts/*`, and compared runtime behavior against accepted ADRs. No ADRs were modified. Conflicts are documented; locally safe corrections were applied (see § Corrections Applied).

---

## ADR Alignment Matrix

| ADR | Title | Status | Evidence |
|-----|-------|--------|----------|
| **0005** | NestJS + Fastify backend | **IMPLEMENTED** | `apps/api/src/app.ts` — `NestFactory` + `FastifyAdapter`; domain modules for catalog, cart, checkout, auth, payments, AI proxy |
| **0006** | Database & data architecture | **PARTIAL** | Prisma + PostgreSQL with bounded schemas in `packages/database/prisma/schema.prisma`; worker uses PG outbox polling, not BullMQ |
| **0007** | Frontend architecture | **PARTIAL** | Next.js 15 App Router in `apps/web` + `apps/admin`; RSC for catalog; CSS custom properties per ADR-0009 deviation; no Tailwind/TanStack Query yet |
| **0008** | Authentication & identity | **IMPLEMENTED** | Argon2 passwords, HttpOnly session cookies, CSRF, separate customer/admin cookies, RBAC guards, admin MFA gate |
| **0009** | API contract & communication | **PARTIAL** | `/v1/*` REST, Zod validation, idempotency keys, error envelopes; no committed OpenAPI artifact; `{ items, page, total }` not `{ data, meta }` |
| **0010** | Catalog/inventory/search | **IMPLEMENTED** | Product→Variant→SKU→Offer; inventory balances; PG FTS search; reservations at checkout |
| **0011** | Cart/checkout/orders/payments | **PARTIAL** | Full cart/checkout flow; M-Pesa adapter + webhooks; `PAYMENTS_ENABLED=false` locally; async payment via worker outbox |
| **0012** | Pricing/promotions/tax | **IMPLEMENTED** | `FinancialCalculationEngine` with integer minor units; promotions admin APIs; golden tests |
| **0013** | Fulfillment/shipping/returns | **PARTIAL** | Order states through `PENDING_PAYMENT`→`PAID`; no shipment/return modules |
| **0014** | Notifications | **PARTIAL** | Notification intents + worker console email adapter; no SMS/WhatsApp |
| **0015** | AI/RAG/agent/tools | **IMPLEMENTED** | `apps/ai-service` + `ApiToolExecutor`; service JWT; deterministic provider for local dev; pgvector on knowledge chunks |
| **0016** | External integrations | **PARTIAL** | M-Pesa port/adapter; webhook HMAC; no object storage or courier adapters |
| **0017** | Observability | **PARTIAL** | JSON logs, `x-request-id`, `/health/*`, `/metrics`; OTEL no-op unless exporter configured |
| **0018** | Security/privacy/audit | **IMPLEMENTED** | Helmet, CORS allowlist, rate limits, audit schema, security gate script, no secrets in frontend bundles |
| **0019** | Deployment/CI/CD/DR | **PARTIAL** | Docker Compose, GitHub Actions CI, staging compose; no production IaC in-repo |
| **0020** | Testing/QA/performance | **PARTIAL** | Vitest unit/integration, Playwright smoke, k6 scripts (aspirational); limited E2E coverage |

---

## Architecture Flow (Verified)

```
Browser (Web :3001 / Admin :3004)
    ↓  HTTPS/cookies + CSRF (same-origin via SDK)
NestJS API (:3000)
    ↓
PostgreSQL (:5433)   Redis (:6379)
    ↓
Worker (:3002) — outbox polling, reservations, payments reconcile
    ↓
AI Service (:3003) — service JWT, tool calls back to API /v1/ai/tools/*
```

**Confirmed:** Browser does NOT directly access PostgreSQL, Redis, payment credentials, AI provider keys, or internal service JWT secrets.

Frontends use `NEXT_PUBLIC_API_BASE_URL` only. Grep of `apps/web` and `apps/admin` found no reads of `OPENAI_*`, `MPESA_*`, `SESSION_SECRET`, or server API keys.

---

## Conflicts Identified

| # | Conflict | ADR | Resolution |
|---|----------|-----|------------|
| 1 | Node does not auto-load `.env`; `node apps/api/dist/index.js` starts with `databaseConfigured: false` | ADR-0019 local dev | **Fixed:** Added `scripts/dev/start-local.ps1` using `node --env-file=.env` + per-service PORT overrides |
| 2 | Shared `.env` sets `PORT=3000`; worker/AI inherit wrong port if started naively | ADR-0019 | **Fixed:** `start-local.ps1` sets `PORT=3002` / `3003` + `SERVICE_NAME` overrides |
| 3 | Worker uses PG outbox, not BullMQ | ADR-0006 | **Documented** — acceptable v1 deferral; no ADR change |
| 4 | Frontend uses CSS variables, not Tailwind | ADR-0007 | **Documented** — ADR-0009 CSS custom properties path accepted in implementation |
| 5 | No OpenAPI committed artifact | ADR-0009 | **Documented** — SDK hand-maintained; EXTERNAL to generate OpenAPI |
| 6 | AI chat returns 502 when AI service JWT/env mismatches API | ADR-0015 | **Fixed by correct startup** — all services must share `SERVICE_JWT_SECRET` via `--env-file=.env` |

No silent ADR modifications were made.

---

## Corrections Applied (This Validation Pass)

| File | Change |
|------|--------|
| `scripts/dev/start-local.ps1` | New — starts API/worker/AI/web/admin with correct env and ports |
| `scripts/dev/journey-validation.mjs` | New — automated customer journey API validation |

---

## Repository Structure Verified

| Path | Purpose | Status |
|------|---------|--------|
| `apps/web` | Customer storefront (Next.js) | Present, 11 routes |
| `apps/admin` | Operations portal (Next.js) | Present, 9 routes |
| `apps/api` | NestJS + Fastify REST API | Present |
| `apps/worker` | Background jobs (outbox) | Present |
| `apps/ai-service` | AI orchestration | Present |
| `packages/sdk` | Typed API client | Present |
| `packages/ui` | Design tokens | Present |
| `packages/database` | Prisma + seeds | Present |
| `packages/validation` | Zod schemas | Present |
| `infrastructure/docker/compose` | Local/staging Compose | Present |
| `scripts/smoke`, `scripts/integrity`, `scripts/security` | Quality gates | Present |
| `e2e/` | Playwright smoke | Present (minimal) |

---

## Health Endpoints

| Service | Port | Live | Ready |
|---------|------|------|-------|
| API | 3000 / 3005* | `/health/live` | `/health/ready` (+ DB check when configured) |
| Worker | 3002 | `/health/live` | `/health/ready` |
| AI service | 3003 | `/health/live` | `/health/ready` |
| Web | 3001 | Next.js page render | — |
| Admin | 3004 | Next.js page render | — |

\*Port 3005 used during validation when port 3000 instance lacked `.env` loading.

---

*End of architecture verification.*
