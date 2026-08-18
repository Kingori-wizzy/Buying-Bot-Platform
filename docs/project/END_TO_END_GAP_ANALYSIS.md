# End-to-End Gap Analysis

**Version:** 0.1.0-rc.2  
**Date:** 2026-08-18  
**Git SHA:** `6304040` (+ uncommitted production execution pass)  
**Authority:** Verified implementation inspection + automated tests

This document compares **expected product behavior** (SRS, ADRs, production prompt) against **actual verified implementation**. Status values: **IMPLEMENTED**, **PARTIAL**, **MOCKED**, **MISSING**, **BLOCKED (EXTERNAL)**, **BROKEN**.

---

## Summary

| Area                       | Status                      | Customer journey impact                           |
| -------------------------- | --------------------------- | ------------------------------------------------- |
| Storefront UX              | IMPLEMENTED                 | Professional commerce UI; CSS design system       |
| Catalog / PDP              | IMPLEMENTED                 | Server-authoritative price/stock                  |
| Search (FTS)               | IMPLEMENTED                 | PostgreSQL FTS + filters; no pgvector for catalog |
| External product ingestion | MISSING                     | Internal catalog only                             |
| AI assistant (tools)       | IMPLEMENTED                 | 9 commerce tools; no direct DB                    |
| AI streaming (web)         | PARTIAL                     | API SSE exists; web uses blocking chat            |
| RAG pipeline               | PARTIAL                     | Ingest/embed/store; rerank basic                  |
| Cart                       | IMPLEMENTED                 | PG source of truth; guest + auth                  |
| Checkout / pricing         | IMPLEMENTED                 | Minor units; tax fail-closed                      |
| Inventory reservation      | IMPLEMENTED                 | Transactional; concurrency tests                  |
| Payment (M-Pesa)           | PARTIAL                     | Sandbox adapter + webhook tests; live EXTERNAL    |
| Worker payment outbox      | **IMPLEMENTED** (this pass) | `payment.initiate` now wired in worker            |
| Orders (customer)          | IMPLEMENTED                 | History, detail, IDOR checks                      |
| Fulfillment states         | MISSING                     | No SHIPPED/DELIVERED per ADR-0013 deferral        |
| Admin orders list          | **IMPLEMENTED** (this pass) | Was placeholder; now uses API                     |
| Notifications              | PARTIAL                     | Console/stub adapters; queue safe                 |
| E2E Playwright purchase    | **IMPLEMENTED** (this pass) | API flow through checkout                         |
| OpenAPI artifact           | MISSING                     | Hand-maintained SDK                               |
| Performance (measured)     | BLOCKED                     | Needs staging host                                |
| DR restore                 | PASS (local)                | Script evidence in M24                            |

**Final gap posture:** Core customer journey (discover → cart → checkout → order) is **technically complete locally**. Live payment, external notifications, staging SLO measurement, and fulfillment remain **externally blocked or deferred**.

---

## Feature matrix

| Feature                       | Expected behavior                        | Current implementation                 | Actual verification             | Gap                                      | Required action                  | Status      |
| ----------------------------- | ---------------------------------------- | -------------------------------------- | ------------------------------- | ---------------------------------------- | -------------------------------- | ----------- |
| Homepage                      | Polished landing, nav, featured products | RSC homepage, hero, trust badges       | HTTP 200 local web              | Categories browse API missing            | Optional category endpoint       | PARTIAL     |
| Product list                  | Search, sort, filters, pagination        | `/products` + `/v1/search/products`    | Journey search PASS             | —                                        | —                                | IMPLEMENTED |
| Product detail                | Gallery, variants, server price/stock    | `/products/[slug]` PDP                 | Manual + API getProduct         | Image CDN EXTERNAL                       | Object storage adapter           | PARTIAL     |
| Internal vs external products | Source attribution                       | Internal only in schema                | No external feed                | External ingestion MISSING               | Legitimate API adapters + env    | MISSING     |
| Keyword search                | FTS, typo tolerance, filters             | `searchProducts` service               | Journey PASS                    | pgvector not used for catalog (by ADR)   | —                                | IMPLEMENTED |
| AI chat                       | Tool-grounded answers                    | ai-service + ai-core tools             | Journey AI PASS (503 when down) | Web no SSE streaming                     | Wire `/v1/ai/chat/stream` in web | PARTIAL     |
| AI cart tools                 | addToCart, getCart, etc.                 | 9 tools in runtime                     | Unit tests in ai-core           | —                                        | —                                | IMPLEMENTED |
| RAG                           | Ingest→chunk→embed→retrieve              | knowledge ingest worker path           | Integration tests partial       | Production corpus EXTERNAL               | Seed knowledge docs              | PARTIAL     |
| Add to cart                   | Variant/offer, qty                       | POST `/v1/cart/items`                  | Journey + E2E PASS              | —                                        | —                                | IMPLEMENTED |
| Checkout                      | Price/tax/shipping server-side           | CheckoutService + pricing engine       | Journey + E2E checkout PASS     | Requires purchasable SKU w/ inventory    | Run `seed-staging-cli` for demo  | IMPLEMENTED |
| M-Pesa STK                    | Provider adapter, webhook                | MpesaAdapter sandbox                   | Payment unit/integration tests  | Live Daraja EXTERNAL                     | Credentials + callback URL       | BLOCKED     |
| Worker payment.initiate       | Outbox → provider HTTP                   | `payment-initiate.ts` wired in worker  | Worker unit test PASS           | Production Daraja HTTP in worker         | Complete when keys exist         | PARTIAL     |
| Order confirmation            | PENDING_PAYMENT → PAID                   | Payment webhook worker path            | Sandbox webhook tests           | End-to-end PAID needs worker+webhook run | Document sandbox flow            | PARTIAL     |
| Customer orders               | List + detail, no IDOR                   | `/v1/orders/me`, `/v1/orders/:id`      | E2E order GET PASS              | —                                        | —                                | IMPLEMENTED |
| Admin orders                  | List from API                            | `/admin/orders` uses `adminListOrders` | Build PASS                      | Admin order detail uses customer GET     | Add admin GET by id optional     | IMPLEMENTED |
| Admin catalog/inventory       | CRUD + adjust                            | Admin pages exist                      | Manual admin smoke              | Some pages thin                          | Expand inventory adjust UX       | PARTIAL     |
| MFA (admin)                   | ADR-0008 stepped-up auth                 | TOTP + step-up endpoints               | Integration tests               | UI step-up flow partial                  | Admin UX for MFA                 | PARTIAL     |
| Email/SMS/WhatsApp            | Provider abstraction                     | Stub/console adapters                  | Queue persists intents          | Live providers EXTERNAL                  | SMTP/SMS/WhatsApp creds          | BLOCKED     |
| Security                      | CSRF, sessions, RBAC                     | Guards + security gate                 | `security:gate` PASS            | Pen-test EXTERNAL                        | Schedule pen-test                | PARTIAL     |
| Observability                 | Metrics, health, logs                    | `/health`, `/metrics`                  | Smoke PASS                      | Alertmanager EXTERNAL                    | Deploy OTel stack                | PARTIAL     |
| CI/CD                         | lint/test/build/e2e                      | `.github/workflows/ci.yml`             | verify mostly PASS              | audit:deps transitive fail               | Track upstream Prisma dep        | PARTIAL     |
| Playwright E2E                | Full purchase journey                    | `e2e/customer-purchase-flow.spec.ts`   | **PASS** (API) 2026-08-18       | Web UI skipped without WEB_BASE_URL      | Start web for browser E2E        | IMPLEMENTED |

---

## Critical fixes completed (this execution pass)

1. **Worker payment outbox wiring** — `apps/worker/src/payment-initiate.ts` + handler in `app.ts` (was `undefined`).
2. **Admin orders page** — Removed false "no API" message; live list from `GET /v1/admin/orders`.
3. **SDK** — Added `adminListOrders()` (removed non-existent `adminGetOrder`).
4. **Journey validation** — Scans for purchasable offer (`staging-smoke-sample` preferred); includes checkout step.
5. **Playwright E2E** — Full API purchase through `PENDING_PAYMENT`; uses Playwright cookie jar + staging seed.

---

## Verification prerequisites

Local end-to-end checkout requires:

```powershell
docker compose -f infrastructure/docker/compose/docker-compose.yml up -d postgres redis
pnpm run build --filter=@buying-bot/api --filter=@buying-bot/worker
node --env-file=.env packages/database/dist/seed-staging-cli.js
node --env-file=.env apps/api/dist/index.js
# Optional: worker on :3002 for payment.initiate processing
```

---

## Classification input

Technical customer journey gaps closed for **local demo**. Remaining gaps are **external integrations**, **fulfillment domain**, **AI streaming UX**, and **staging performance evidence** — not core commerce logic defects.
