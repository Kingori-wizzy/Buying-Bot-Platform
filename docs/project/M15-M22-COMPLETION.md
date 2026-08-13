# M15–M22 milestone completion log

**Authority:** `docs/project/milestones.md` + Accepted ADR-0014–0020  
**Quality gate:** `pnpm run verify` — PASS (2026-08-13)  
**Postgres:** `pgvector/pgvector:pg16` (host port 5433)

## Milestone reports

### M15 — AI service

- **Objectives:** Model provider ports/adapters; Fastify AI service; chat + SSE; guardrails; service JWT; metrics seam
- **Key paths:** `packages/ai-core/**`, `apps/ai-service/**`
- **Tests:** ai-service 5; ai-core 6 — pass
- **ADR check:** AI has **no** Prisma/Redis/SQL imports
- **Risks:** Live vendor keys not required locally (`AI_PROVIDER=deterministic` for tests)

### M16 — RAG / knowledge

- **Objectives:** Knowledge documents/chunks/embeddings (pgvector); ingest worker; hybrid retrieve API; citations
- **Migration:** `20260813180000_m15_m22_ai_notifications`
- **Tests:** knowledge retrieve covered in API suite
- **OPEN:** OCR/PDF/DOCX deep parsers deferred to adapter hooks (text/markdown ingest implemented)

### M17 — AI commerce tools

- **Objectives:** API AI gateway + tool gateway; tool loop; no invented prices; `/assistant` page
- **Tools:** searchProducts, getProduct, getOfferPrice, checkStock, cart, orders, recommend, explainPricing
- **ADR check:** tools re-AuthZ via API; payment tools require human approval path

### M18 — Notifications

- **Objectives:** intents/deliveries/templates; email/SMS/WhatsApp ports; worker delivery
- **ADR-0014:** async-only; console/recording adapters (SMTP/WhatsApp enable with credentials)

### M19 — Observability

- **Objectives:** `/metrics` (Prometheus text); OTel bootstrap seam; Grafana/Prometheus examples
- **Note:** SLOs remain **ASPIRATIONAL** (ADR-0017)

### M20 — Security hardening

- **Objectives:** Helmet CSP/HSTS; API keys foundation; upload validation; checklist + regressions
- **Doc:** `docs/Security/hardening-checklist.md`

### M21 — Performance

- **Objectives:** product GET cache (Redis/memory); compression; k6 smoke scripts
- **Targets:** ASPIRATIONAL — not claimed as measured prod SLOs

### M22 — DR

- **Objectives:** backup/restore scripts; runbooks; outbox reprocess; prod boot guards
- **Drill:** dry-run documented; live restore **not** signed VERIFIED (operator optional)
- **RPO/RTO:** ≤24h / ≤4h preserved (not strengthened)

## Consolidated readiness for M23–M25

| Gate                                                | Status                                                     |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Typecheck/lint/test/build/audit                     | PASS                                                       |
| Migrations (identity + commerce + AI/notifications) | PASS                                                       |
| AI no direct DB                                     | PASS                                                       |
| pgvector enabled                                    | PASS                                                       |
| Staging deploy (compose + GHCR workflow)            | DONE (M23) — remote host EXTERNAL                          |
| Live DR drill signed                                | See `docs/Deployment/drills/M24-restore-drill-evidence.md` |
| Pen-test / Vault                                    | EXTERNAL / PLANNED                                         |

## M23–M25 pointers

| Doc                     | Path                                                       |
| ----------------------- | ---------------------------------------------------------- |
| Staging compose         | `infrastructure/docker/compose/docker-compose.staging.yml` |
| RC notes                | `RELEASE_NOTES.md`, `VERSION` (`0.1.0-rc.1`)               |
| Readiness report        | `docs/project/PRODUCTION_READINESS_REPORT.md`              |
| Launch checklist        | `docs/project/PRODUCTION_LAUNCH_CHECKLIST.md`              |
| External prerequisites  | `docs/project/EXTERNAL_PREREQUISITES.md`                   |
| Final report            | `docs/project/FINAL_IMPLEMENTATION_REPORT.md`              |
| Production architecture | `docs/Deployment/PRODUCTION_ARCHITECTURE.md`               |

**Status:** M23–M25 engineering/documentation complete in-repo.
**Classification:** CONDITIONALLY PRODUCTION READY.
