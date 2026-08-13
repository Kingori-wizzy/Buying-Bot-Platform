# Implementation milestones

Durations are **estimates** for planning only.

| ID | Name | Objective | Deliverables | Deps | Est. | Exit criteria |
| --- | --- | --- | --- | --- | --- | --- |
| M0 | Docs/architecture baseline | Complete this documentation set | requirements/, design/, project/, diagrams/ | ADRs Accepted | 1–2w | Docs audit pass |
| M1 | Dev infra hardening | Reliable local/CI foundation | Env docs, compose parity, DX scripts | M0 | 1w | lint/typecheck/test green |
| M2 | NestJS+Fastify API | Product HTTP framework | Nest bootstrap, health, OpenAPI skeleton | M1, ADR-0005 | 1–2w | `/v1` health+docs |
| M3 | PostgreSQL+Prisma | Persistence | Schemas/migrations pipeline (empty→identity stub) | M2, ADR-0006 | 2w | migrate on CI |
| M4 | Identity AuthN | Customer/admin login sessions | register/login/logout/reset | M3, ADR-0008 | 2–3w | E2E login |
| M5 | AuthZ RBAC MFA | Permissions + admin MFA | guards, MFA enroll | M4 | 2w | IDOR tests |
| M6 | Catalog | Products/variants/SKU/Offer | Admin CRUD + public reads | M5, ADR-0010 | 3w | PDP API |
| M7 | Inventory | Movements/reservations | adjust, reserve APIs | M6 | 2w | concurrency tests |
| M8 | Pricing engine | Money/promos/tax | calculation module | M6–M7, ADR-0012 | 2–3w | golden fixtures |
| M9 | Cart | Guest/auth cart | cart APIs | M8 | 1–2w | merge tests |
| M10 | Checkout/orders | PENDING_PAYMENT orders | checkout idempotent | M9, ADR-0011 | 2–3w | snapshot tests |
| M11 | Payments M-Pesa | PaymentProvider adapter | initiate | M10 | 2–3w | sandbox STK |
| M12 | Webhooks/outbox/reconcile | Confirm pay safely | webhooks, outbox, jobs | M11 | 2w | idempotent webhook |
| M13 | Storefront | Next web | catalog/cart/checkout UI | M6–M12, ADR-0007 | 3–4w | E2E purchase sandbox |
| M14 | Admin portal | Next admin | ops UI | M5–M12 | 3w | role-gated UI |
| M15 | AI service | Orchestration | ai-service + SSE | M2, ADR-0015 | 2w | stream chat |
| M16 | RAG | Knowledge ingest | chunks/embeddings | M3,M15 | 2w | cited answers |
| M17 | AI commerce tools | Tools to catalog/price | tool gateway | M6–M12,M15 | 2w | no invented price |
| M18 | Notifications | Email/SMS adapters | intents/jobs | M12, ADR-0014 | 2w | async send |
| M19 | Observability | OTel/alerts | dashboards | M2+ | 2w | correlated traces |
| M20 | Security hardening | Headers, CSRF, scans | pen-test prep | M5+ | 2w | checklist |
| M21 | Perf/load | Validate targets | k6 reports | M13+ | 1–2w | report vs ASPIRATIONAL |
| M22 | DR testing | Restore drills | drill evidence | M3, ADR-0019 | 1w | drill signed |
| M23 | Staging | Prod-like env | staging deploy | M13–M22 | 1–2w | smoke+E2E |
| M24 | Production readiness | Gap closure | PR plan zero critical | M23 | 1–2w | go/no-go |
| M25 | Production launch | Live Kenya commerce | prod cutover | M24 | 1w | monitored launch |

**Risks (per milestone):** payment sandbox delays (M11); inventory races (M7);
AI scope creep (M15–17). Mitigate with ADR boundaries and tests first.
