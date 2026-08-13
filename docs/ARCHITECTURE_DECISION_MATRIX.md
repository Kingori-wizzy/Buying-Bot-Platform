# Architecture decision matrix

**Status:** Active summary of accepted ADRs  
**Date:** 2026-08-13  
**Scope:** ADR-0005 through ADR-0020  
**Source index:** [DECISIONS.md](./DECISIONS.md)

This document consolidates architecture decisions after the ADR-0013–0020
completion program. Normative detail remains in each ADR; this file is the
cross-cutting map.

---

## 1. ADR summary (0005–0020)

| ADR | Title | Status | Primary decision | Source of truth | Major technologies | Dependencies | Implementation impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0005 | Backend HTTP framework | Accepted | NestJS + Fastify for `apps/api` | N/A (framework) | NestJS, Fastify | 0001–0004 | Scaffold API modules later |
| 0006 | Database & data | Accepted | PostgreSQL SoT; Redis cache/queues; BullMQ; S3; pgvector; PG FTS | PostgreSQL | PostgreSQL, Redis, BullMQ, S3, Prisma (later) | 0005 | Datastores before features |
| 0007 | Frontend | Accepted | Next.js App Router for web/admin/docs | API for commerce state | Next.js, React, TanStack Query | 0005–0006 | Scaffold frontends later |
| 0008 | AuthN/AuthZ | Accepted | First-party Nest identity; realms; RBAC; MFA admin | PostgreSQL sessions/creds | Sessions, cookies, service JWT | 0005–0007 | Auth before protected APIs |
| 0009 | API & communication | Accepted | Versioned REST + OpenAPI + SDK; webhooks; SSE | OpenAPI contract | REST, OpenAPI, Zod, BullMQ | 0005–0008 | Contract-first APIs |
| 0010 | Catalog/inventory/search | Accepted | Product→Variant→SKU→Offer; movements; PG FTS | PostgreSQL catalog/inventory | PG FTS, pgvector, object media | 0005–0009 | Catalog before sell |
| 0011 | Cart/checkout/orders/payments | Accepted | Order before pay confirm; M-Pesa port; outbox | PostgreSQL orders/payments | Idempotency, webhooks, PaymentProvider | 0005–0010 | Commerce core |
| 0012 | Pricing/promotions/tax | Accepted | Integer money; calculation engine; TaxCalculator | Snapshot + Offer | Deterministic pipeline | 0010–0011 | Before checkout totals |
| 0013 | Fulfillment/shipping/returns | Accepted | Separate status machines; DeliveryProvider | PostgreSQL fulfillment | Shipments, returns, POD | 0010–0012 | Post-payment ops |
| 0014 | Notifications/omnichannel | Accepted | Async NotificationIntent; transactional vs marketing | PostgreSQL intents | Email/SMS/WA adapters, BullMQ | 0008–0013 | Side-effect messaging |
| 0015 | AI/RAG/agents/tools | Accepted | Constrained tools; no direct DB; RAG ≠ transactional truth | Domain APIs + PG conversations | ai-service, pgvector, SSE | 0008–0014 | Assistant after APIs |
| 0016 | External integrations | Accepted | Port→Adapter→Provider; reconcile | PG receipts + domain | Webhooks, polling | 0009–0015 | All provider work |
| 0017 | Observability/reliability | Accepted | OTel-aligned logs/metrics/traces; degrade gracefully | Telemetry backends | OTel, health endpoints | All apps | Ops before scale |
| 0018 | Security/privacy/audit | Accepted | Trust boundaries; tech≠legal claim | PostgreSQL audit | TLS, RBAC, redaction | 0008+ | Continuous |
| 0019 | Deploy/CI/CD/DR | Accepted | Containers first; K8s later if needed; restore drills | Backups of PG/objects | Docker, GH Actions | 0006, 0017 | Staging/prod path |
| 0020 | Testing/QA/performance | Accepted | Vitest/RTL/Playwright/axe; critical-path focus | Test evidence in CI | Vitest, Playwright | All | Quality gates |

ADR-0001–0004 remain accepted foundation (monorepo, TS, commits, ops shell).

---

## 2. Domain ownership matrix

| Domain | Owner (bounded context / ADR) | Notes |
| --- | --- | --- |
| Identity / Users / Credentials / Sessions | Identity (0008) | |
| Organizations / Membership / Tenant readiness | Identity (0008) | |
| RBAC / Permissions | Identity (0008) + API guards (0005/0009) | |
| Catalog / Products / Variants / Categories / Brands | Catalog (0010) | |
| SKUs / Offers | Catalog (0010) | Offer = commercial boundary |
| Pricing / Sale windows | Catalog Offer + Calculation (0010/0012) | |
| Promotions / Coupons | Pricing (0012) | |
| Tax calculation | TaxCalculator port (0012) | Configured rates; not hardcoded |
| Inventory / Locations / Movements / Reservations | Inventory (0010) | |
| Cart | Cart (0011) | |
| Checkout | Checkout (0011) + Pricing (0012) | |
| Orders / Order items snapshots | Orders (0011) | |
| Payments / Attempts / Transactions / Refunds | Payments (0011) | |
| Fulfillment / Pack / Dispatch | Fulfillment (0013) | |
| Shipping quotes | ShippingQuote (0011/0012/0013) | |
| Delivery / Shipments / Tracking / POD | Shipment (0013) | |
| Returns / Inspection | Returns (0013) | |
| Notifications | Notifications (0014) | |
| AI / RAG / Agents / Tools | AI (0015) via API | |
| Search (catalog) | Catalog search (0010); API contract (0009) | Derived index |
| Integrations | Integrations (0016) | |
| Observability | Platform ops (0017) | |
| Audit (security/commerce) | Security (0018) + domain events | PG |
| Infrastructure / CI/CD / DR | Platform (0019) | |
| Testing strategy | QA (0020) | |

---

## 3. Source-of-truth matrix

| System | Role |
| --- | --- |
| **PostgreSQL** | Authoritative transactional state (identity, catalog, inventory, cart, orders, payments, fulfillment, returns, notifications intents, conversations, audit) |
| **Redis** | Cache, rate limiting, locks, BullMQ broker — **never** financial/inventory ledger |
| **BullMQ** | Asynchronous job transport |
| **Object storage** | Binary/media/documents/POD blobs; DB holds keys/metadata |
| **OpenAPI** | Authoritative external HTTP API description |
| **`@buying-bot/sdk`** | Preferred typed client; not AuthZ authority |
| **External providers** | External rail state (M-Pesa, courier, SMS) until reconciled into platform |
| **AI knowledge / RAG** | Informational knowledge with citations — **never** transactional truth |
| **AI tools** | Controlled access to authoritative platform capabilities |
| **Frontend (web/admin)** | Presentation only; never price/stock/payment/order authority |
| **pgvector / FTS** | Derived retrieval indexes rebuildable from PostgreSQL |

---

## 4. Security boundary matrix

```text
Browser (untrusted)
    ↓
Next.js web | Next.js admin  (separate cookie realms)
    ↓
NestJS API  (AuthN + AuthZ authority)
    ↓
Domain / Application services
    ↓
Infrastructure (PG, Redis, object storage, provider adapters)
```

| Actor | Authentication | Authorization | Data access | Allowed ops | Trust |
| --- | --- | --- | --- | --- | --- |
| Customer | Session / bearer | Own resources + public catalog | Scoped queries | Shop, pay, track, return request | Low |
| Staff | Admin realm + MFA (as required) | RBAC permissions | Ops data per role | Fulfill, support, limited refunds | Medium |
| Admin / Super-admin | MFA + step-up | Broad RBAC | Config + audit | Privileged actions | High |
| Service (worker/ai/api internal) | Service JWT | Audience + scopes | Via ports | Jobs, tools, enqueue | Constrained high |
| AI (model) | N/A (not a principal) | Tools re-check user/service AuthZ | Via tools only | Suggest / invoke allowed tools | Untrusted reasoner |

---

## 5. Architecture dependency graph

```text
apps/web ─────────────┐
apps/admin ───────────┼──► @buying-bot/sdk ──► apps/api (NestJS/Fastify)
apps/docs ────────────┘                         │
                                                ├── domain modules
future mobile ─────────────────────────────────►│
                                                ├── ► PostgreSQL
                                                ├── ► Redis (cache/limits)
                                                ├── ► BullMQ enqueue / outbox
                                                ├── ► Object storage
                                                ├── ► PaymentProvider / DeliveryProvider /
                                                │     NotificationProvider / TaxCalculator /
                                                │     ShippingQuote / ModelProvider (ports)
                                                └── ► apps/ai-service (service JWT)
                                                         │
                                                         └── tools back into apps/api

apps/worker ──► BullMQ consume ──► application ports ──► PG / providers

packages/* ◄── shared contracts (types, validation, auth ports, ai-core, database ports)
apps must not import other apps’ internals
```

---

## 6. Cross-ADR consistency review (2026-08-13)

Reviewed ADR-0005–0020 for contradictions. **No amendments required.**

| Check | Result |
| --- | --- |
| SoT conflicts | None — PG ledger; Redis ephemeral |
| Framework conflicts | Nest API only; Next frontends; workers separate |
| Auth boundaries | Backend AuthZ; separate web/admin realms |
| Money/inventory | Integer money + movements; AI cannot invent |
| Payments | Init ≠ confirm; outbox mandatory when live |
| Fulfillment vs order status | Lean order; rich fulfillment/shipment (0013) |
| Notifications | Async; not in payment tx (0014) |
| AI | Tools only; no direct DB (0015) |
| Search | PG FTS first; dedicated engine later (0010) |
| Deploy | Containers first; K8s not required for v1 (0019) |
| Testing | Vitest/Playwright; no 100% vanity (0020) |
| Circular deps | None in ADR dependency direction |

---

## 7. Remaining architectural gaps (genuine)

These are **policy/vendor/legal** or **future scale** items, not missing core ADRs:

1. Specific courier, SMS, email, WhatsApp vendors (procurement)
2. Statutory Kenya tax rate tables (finance/legal config, not code constants)
3. Formal legal compliance attestation (counsel)
4. PCI scope validation when cards launch
5. Exact production RPO/RTO after restore drills
6. When to extract dedicated search / K8s / multi-region (evidence-triggered)
7. Fraud/risk scoring product (future ADR)
8. Marketplace seller settlements (future ADR)

---

## 8. Implementation readiness

The platform is ready to proceed into:

1. SRS refinement  
2. SDS  
3. Database logical design (from ADRs; still no migrate until milestone)  
4. API specification (OpenAPI)  
5. UI/UX specification  
6. Implementation planning  
7. Phased development  

**Architecture-first baseline for ADR-0005–0020 is complete.** Product
implementation remains a separate explicit milestone program.
