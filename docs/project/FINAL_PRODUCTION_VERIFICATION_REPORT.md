# Final production verification report

**Platform:** Buying Bot Platform  
**Version:** `0.1.0-rc.3`  
**Git SHA:** `6304040` (working tree includes rc.3 gap-closure; uncommitted)  
**Date:** 2026-08-18  
**Environment:** LOCAL (Windows, Docker Postgres/Redis)

---

## 1. Executive Summary

This pass closed remaining **locally solvable** production gaps without changing accepted ADRs.

Verified local customer journey:

REGISTER → LOGIN → DISCOVER → CART → CART UPDATE → CHECKOUT (server `payableMinor`) → sandbox webhook → **PAID** → order GET

**Final classification: CONDITIONALLY PRODUCTION READY**

Not PRODUCTION READY: live M-Pesa, DNS/TLS, notification vendors, staging SLO measurement, pen-test, and legal gates remain EXTERNAL.

---

## 2. Current Version

`0.1.0-rc.3` (`VERSION`, root `package.json`).

## 3. Git SHA

`6304040` plus uncommitted gap-closure changes documented below.

## 4. Architecture Verification

WEB → API → AI SERVICE (SSE). PostgreSQL authoritative for cart/checkout/payments. Worker outbox for `payment.initiate`. No ADR silently modified. Fulfillment SHIPPED/DELIVERED not invented (ADR-0013 deferred). OrderStatus remains PENDING_PAYMENT / PAID / CANCELLED / FAILED / RECONCILIATION_HOLD.

## 5. Customer Journey Verification

| Step              | Result | Evidence                                      |
| ----------------- | ------ | --------------------------------------------- |
| Register / login  | PASS   | `scripts/dev/journey-validation.mjs`          |
| Catalog / search  | PASS   | Journey + Playwright                          |
| Cart add / update | PASS   | Journey                                       |
| Checkout totals   | PASS   | `payableMinor=19900` (KES 199.00)             |
| Sandbox webhook   | PASS   | Journey: accepted (not live Daraja)           |
| Order PAID        | PASS   | Journey poll GET `/v1/orders/:id`             |
| Browser pages     | PASS   | Playwright WEB_BASE_URL=http://127.0.0.1:3001 |

## 6. Catalog Verification

Public list/search serialize **active** offers only. PDP slug lookup no longer treats slugs as UUIDs (was HTTP 500). Empty `offers[]` came from leftover ACTIVE integration-test products without offers — UI shows **Not currently purchasable** (no fake Add to Cart). Staging seed demotes `Inv Product` / `Pay Product` / `Cart Product` prefixes to DRAFT when `seed-staging-cli` is run.

## 7. Cart Verification

PostgreSQL cart; add/update/remove; merge test PASS; server re-prices. Client totals not authoritative.

## 8. Checkout Verification

Idempotency-Key required. Inventory reserved. Financial snapshot stored. E2E asserts `PENDING_PAYMENT` and `payableMinor`.

## 9. Payment Verification

Sandbox adapter + HMAC webhook + idempotent `confirmPaymentForOrder`. Duplicate webhook: reservation COMMITTED stays PAID. Rejected STK: stays PENDING_PAYMENT. Amount mismatch: throws, order unchanged. Late payment after EXPIRED reservation: **RECONCILIATION_HOLD**, `on_hand` unchanged. Live M-Pesa: **BLOCKED / EXTERNAL**.

## 10. Inventory Verification

Concurrent oversell rejected. Expiry releases reserved without changing on_hand. `available = on_hand - reserved` integrity PASS (12/12).

## 11. Authentication Verification

Register, verify email, login, CSRF, customer realm, MFA reject invalid codes — auth.integration.test PASS.

## 12. Authorization Verification

Customer denied admin ping. Customer order GET requires owner (IDOR fix). Admin orders: `GET /v1/admin/orders` and `GET /v1/admin/orders/:id` with realm + MFA + `orders:read`.

## 13. AI Verification

Tools grounded; 503 when unavailable; journey AI PASS; web SSE client via SDK `chatStream`. Browser never calls the model.

## 14. RAG Verification

pgvector retrieve + FTS fallback tests exist. Production corpus EXTERNAL.

## 15. Search Verification

PostgreSQL FTS journey PASS. Search outage does not block getProduct/cart/checkout (separate endpoints).

## 16. Notification Verification

Adapter/queue tests PASS. SMTP/SMS/WhatsApp **EXTERNAL**.

## 17. Admin Verification

Live orders list + detail via admin API. Server authorization remains the boundary.

## 18. Security Verification

`pnpm run security:gate` PASS. `.env.production.example` present (placeholders). No tracked secrets. CSRF/CORS production wildcard blocked. Pen-test **EXTERNAL**.

## 19. Database Verification

Integrity 12/12 PASS. Migrations unchanged this pass. Slug vs UUID query fixed.

## 20. Performance Verification

**BLOCKED** — no staging measurements. Do not invent p95.

## 21. Reliability Verification

AI/API fail-closed 503 for AI. Outbox worker payment handler implemented. Redis optional for cache.

## 22. Disaster Recovery Verification

Local restore drill previously recorded (M24). Cloud PITR **EXTERNAL**.

## 23. Observability Verification

Health live/ready PASS. `/metrics` present. Alertmanager **EXTERNAL**.

## 24. CI/CD Verification

Quality workflow + docker-build exist. `audit:deps` now clean with override.

## 25. Dependency Audit

| Item                            | Result                                |
| ------------------------------- | ------------------------------------- |
| Package                         | `deepmerge-ts`                        |
| Advisory                        | GHSA-ggr8-5vv4-36mx (fixed in 8.0.0+) |
| Path                            | `@prisma/config@6.16.2`               |
| Remediation                     | pnpm override `deepmerge-ts@^8.0.1`   |
| `pnpm audit --audit-level=high` | **No known vulnerabilities found**    |
| Prisma major upgrade            | Not applied (unnecessary)             |

## 26. End-to-End Test Results

| Suite                   | Result          |
| ----------------------- | --------------- |
| `pnpm test`             | PASS (24 tasks) |
| API tests               | 32 passed       |
| Worker payment-initiate | PASS            |
| Journey (incl. PAID)    | PASS            |
| Playwright API + Web    | **2 passed**    |

## 27. Browser E2E Results

`WEB_BASE_URL=http://127.0.0.1:3001` homepage, products, assistant, cart HTTP load **PASS**. Full UI click-through checkout not automated (API covers commerce). Live visual polish verified by page load, not pixel QA.

## 28. External Prerequisites

See [EXTERNAL_PREREQUISITES.md](./EXTERNAL_PREREQUISITES.md). Live Daraja, DNS/TLS, secrets manager, SMTP/SMS/WhatsApp, object storage, pen-test, legal.

## 29. Deferred ADR Items

ADR-0013 fulfillment/shipping/returns. OpenAPI codegen. External product feeds.

## 30. Remaining Technical Debt

- Guest orders with `userId=null` remain UUID-capability URLs.
- AI SSE chunks after generation (not model token stream).
- Catalog still lists leftover ACTIVE test products until seed-staging demote is run.
- Prisma generate EPERM on Windows when API holds the query engine DLL.

## 31. Remaining Risks

Live callback misconfiguration; staging latency unknown; leftover test catalog SKUs confuse demos until demoted.

## 32. Production Readiness Score

Weighted ~**76%** (commerce journey stronger; external/payments live still low).

## 33. Final Classification

## CONDITIONALLY PRODUCTION READY

## 34. Exact Next Human Actions

1. Commit/push rc.3 working tree.
2. Provision staging host + TLS; run `DEPLOYMENT_RUNBOOK`.
3. Obtain Daraja sandbox then live keys; set `PAYMENTS_ENABLED` only after callback verification.
4. Configure SMTP/SMS; run notification delivery tests.
5. Run k6 against staging; record p95.
6. Schedule pen-test and legal ToS/privacy.
7. Run `node --env-file=.env packages/database/dist/seed-staging-cli.js` on demo DBs to demote leftover test products.

### Verification commands used

```powershell
pnpm audit --audit-level=high
pnpm run lint
pnpm run typecheck
pnpm test
pnpm --filter=@buying-bot/api test
pnpm run security:gate
pnpm run integrity
pnpm run build --filter=@buying-bot/api --filter=@buying-bot/worker --filter=@buying-bot/ai-service --filter=@buying-bot/sdk
$env:API_BASE_URL='http://127.0.0.1:3000'; $env:SMOKE_REQUIRE='1'; node scripts/dev/journey-validation.mjs
$env:API_BASE_URL='http://127.0.0.1:3000'; $env:WEB_BASE_URL='http://127.0.0.1:3001'
pnpm exec playwright test --config e2e/playwright.config.ts e2e/customer-purchase-flow.spec.ts
```
