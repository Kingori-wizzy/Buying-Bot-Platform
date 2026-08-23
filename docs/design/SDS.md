# System Design Specification (SDS)

| Field       | Value                              |
| ----------- | ---------------------------------- |
| Document ID | BBP-SDS-001                        |
| Version     | 1.0.0                              |
| Date        | 2026-08-13                         |
| Status      | Design baseline from Accepted ADRs |
| Precedence  | Accepted ADRs > SDS                |

## 1. Architecture overview

Modular monolith monorepo (pnpm + Turborepo): independently deployable
`web`, `admin`, `api`, `worker`, `ai-service`, `docs` sharing `packages/*`.

```text
Clients → Next.js → @buying-bot/sdk → NestJS/Fastify API
  → Domain services → PostgreSQL
  → Redis / BullMQ / Object storage / Provider ports
API → ai-service (service JWT) → tools → API
Worker ← BullMQ ← outbox/API
```

## 2. Principles

Contracts before impl; PG SoT; ports/adapters; backend AuthZ; AI tools-only;
fail closed on financial uncertainty; async side effects.

## 3–7. Boundaries & dependency rules

- Apps depend on packages; packages never depend on apps.
- No cross-app domain imports.
- HTTP adapters in `apps/api`; domain logic free of Nest/Prisma types where practical.
- Bounded contexts map to PG schemas (ADR-0006): identity, catalog, inventory,
  cart, orders, payments, promotions, notifications, conversations, ai,
  integrations, audit, etc.

## 8. Backend (`apps/api`)

NestJS + Fastify (ADR-0005). Modules per domain. Guards for AuthN/Z. Zod

### Catalog authority (2026-08-20)

Authoritative product journey:

`ADMIN → Product/Variant/SKU/Offer/Inventory (PostgreSQL) → Storefront / Search / AI → Cart → Checkout → (future escrow)`

External marketplace/product-source adapters may remain in the monorepo as
**DEFERRED / FUTURE MARKETPLACE INTEGRATION** but are not part of the active
customer experience. AI tools and public catalog APIs read only the internal catalog.
pipes. Exception filter → ApiErrorBody. Controllers thin; application
services own use cases.

## 9. Frontend

Next.js App Router (ADR-0007). RSC default; client islands for cart/AI/admin
tables. Separate admin origin/cookies. TanStack Query for client server-state.
SDK for API access.

## 10. API

REST `/v1`, OpenAPI, SDK, pagination (offset admin / cursor catalog),
Idempotency-Key, webhooks, SSE for AI (ADR-0009). See [api-design.md](./api-design.md).

## 11–14. Data plane

PostgreSQL authoritative; Prisma planned behind `@buying-bot/database`.
Redis cache/rate-limit/locks/BullMQ. Object storage for media/POD.
Search: PG FTS/pgvector derived. See [database-design.md](./database-design.md).

## 15–16. AI

`apps/ai-service` + `@buying-bot/ai-core` ports. RAG informational; tools for
truth. See [ai-rag-design.md](./ai-rag-design.md).

## 17–18. Auth

First-party sessions; customer vs admin realms; RBAC; MFA admin; service JWT.
See [security-design.md](./security-design.md).

## 19–21. Payments / integrations / notifications

PaymentProvider, DeliveryProvider, Notification* ports; outbox for payment
side effects; async notifications. See integration + fulfillment ADRs.

## 22–24. Audit / observability / security

PG audit; OTel-aligned observability; trust boundaries per ADR-0017/0018.

## 25–27. Deploy / DR / testing

Containers; GH Actions; RPO/RTO foundation; Vitest/Playwright. See
infrastructure, disaster-recovery, testing design docs.

## Related

[system-architecture.md](./system-architecture.md), requirements SRS, ADRs.
