# Real Product Platform Audit

**Date:** 2026-08-20  
**Classification baseline:** CONDITIONALLY PRODUCTION READY (rc.3)  
**Scope:** Repository inspection before real-market product ingestion phase

---

## Executive summary

The Buying Bot Platform has a **solid commerce core** (Product → Variant → SKU → Offer → Inventory, cart, checkout, M-Pesa adapter, AI tool bridge) but **no legitimate external product source integrations are connected**. Catalog data is merchant-admin or staging-seed only. Search uses PostgreSQL FTS/trigram on internal documents. AI commerce tools read the internal catalog only and must not invent prices/stock.

This phase extends the existing architecture (ADR-0005–0020) — it does **not** replace it.

---

## Architecture reused (verified)

| ADR / area | Status | Location |
|------------|--------|----------|
| ADR-0010 Catalog / search | Partial — model complete, import pipeline absent | `packages/database/prisma/schema.prisma`, `apps/api/src/catalog/` |
| ADR-0011 Cart / checkout / payments | Implemented (sandbox M-Pesa) | `apps/api/src/checkout/`, `apps/api/src/payments/` |
| ADR-0012 Pricing / tax | Implemented | `apps/api/src/pricing/` |
| ADR-0015 AI / RAG / tools | Partial — 9 tools; RAG retrieve shape bug | `packages/ai-core/`, `apps/api/src/ai/` |
| ADR-0016 External integrations | Port pattern for payments; catalog import deferred | `apps/api/src/payments/payment-provider.port.ts` |
| ADR-0018 Security | CSRF, IDOR fixes, webhook signatures | `apps/api/src/auth/`, `apps/api/src/payments/` |
| Worker outbox | PG polling (not BullMQ despite ADR diagrams) | `apps/worker/src/app.ts`, `packages/database/src/jobs/` |

---

## Catalog model (existing)

**Schema:** `catalog` — Brand, Category, Product, Variant, Sku, Offer, PriceWindow, MediaAsset, ProductSearchDocument.

**Gaps for real ingestion:**

- No `ProductSource` / external ID mapping tables (only `integrations.webhook_receipts` today)
- No bulk import / feed pipeline (ADR-0010 §30–31 describes async pipeline — not built)
- Admin API creates one variant + one SKU per product only
- `AttributeDefinition` exists but unused in API/search
- Search index = name + descriptions only (no brand, SKU, barcode, attributes)
- No price-range filter on search API
- No product comparison API/UI
- Media: `MediaAsset.objectKey` only — no external URL / attribution fields

**Seed data:**

- Base seed: identity + commerce defaults (`packages/database/src/seed.ts`)
- Staging: one product `staging-smoke-sample` (`seed-staging.ts`)
- Tests: ephemeral `Inv Product`, `Pay Product`, `Cart Product` patterns

---

## Search (existing)

**File:** `apps/api/src/catalog/catalog.service.ts` — `searchProducts()`

- PostgreSQL `plainto_tsquery` + `pg_trgm` ILIKE fallback
- Empty query → list with ILIKE on name/slug
- **No** synchronous external source calls (correct per performance requirements)
- **No** pgvector on products (pgvector used for knowledge RAG only)

---

## AI / RAG / tools (existing)

**Commerce tools (9):** `searchProducts`, `getProduct`, `getOfferPrice`, `checkStock`, `getCart`, `addToCart`, `getOrderStatus`, `recommendProducts`, `explainPricing`

**Missing vs target phase:** `compareProducts`, `getOffers`, `getAvailability`, `calculateCheckout`, payment tools (intentionally excluded from auto-run)

**Grounding:** System prompt requires tool-backed commerce facts (`packages/ai-core/src/prompts/registry.ts`)

**Known bug:** `POST /v1/ai/retrieve` returns `RetrievalResult[]` but ai-service expects `{ citations: Citation[] }` — RAG citations likely empty at runtime.

**Worker:** Outbox handlers for `payment.initiate`, `knowledge.ingest` — no product sync handler yet.

---

## Frontend (existing)

| Surface | State |
|---------|--------|
| PLP / PDP / search | API-driven; gradient/text **placeholders** for images |
| Assistant | SSE chat + inline product cards from `searchProducts` |
| Comparison | **Not implemented** |
| Checkout / orders | Functional with sandbox webhook path |
| Admin catalog | CRUD products/offers; no source management |

**SDK:** `listProducts`, `getProduct`, `searchProducts`, cart CRUD — no compare, no provenance fields on `ProductSummary`.

---

## Payment flow (existing)

- `PaymentProvider` port + `MpesaAdapter` (sandbox simulates STK; production HTTP stub)
- Worker `payment.initiate` outbox wired
- Webhook → `confirmPaymentForOrder` → PAID
- Consumer key/secret in local `.env` only; shortcode/passkey **EXTERNAL BLOCKED**

---

## Integration adapters (existing)

| Integration | Port | Live |
|-------------|------|------|
| M-Pesa | `PaymentProvider` | Sandbox/mock only |
| LLM | `ModelProvider` | Configurable (deterministic default) |
| Email | `EmailPort` | In-memory / console |
| Object storage | Documented in ADR-0006 | Not wired for product images |
| **Product sources** | **None** | **Not implemented** |

---

## Reusable for this phase

1. Product → Variant → SKU → Offer hierarchy (canonical catalog)
2. Pricing engine + immutable checkout snapshot
3. Inventory reservation at checkout
4. Outbox + worker polling pattern for async ingestion
5. AI tool executor → API authoritative reads
6. PostgreSQL FTS search (extend filters + index content)
7. Admin RBAC + service JWT for worker/internal calls
8. Security: CSRF, webhook HMAC, env validation (`@buying-bot/config`)

---

## Must extend (this phase)

1. **ProductSource port** + adapters (mock, CSV fixture; real sources EXTERNAL BLOCKED)
2. **Provenance tables** in `integrations` schema
3. **Ingestion pipeline** (async outbox → normalize → dedupe → persist → reindex)
4. **Price observation history** + freshness statuses (VERIFIED / STALE / UNAVAILABLE / UNKNOWN)
5. **External image URL** handling with attribution + SSRF-safe URL validation
6. **Search** price range + enriched index
7. **AI tools:** compare, getOffers; fix retrieve response shape
8. **Compare API + storefront UI**
9. **Admin source dashboard** (no credential exposure)
10. **Documentation + EXTERNAL prerequisites**

---

## Gaps / blockers (external)

| Prerequisite | Status |
|--------------|--------|
| Merchant / affiliate / marketplace API credentials | EXTERNAL BLOCKED |
| M-Pesa shortcode, passkey, public callback URL | EXTERNAL BLOCKED |
| Image license / attribution contracts per source | EXTERNAL BLOCKED |
| Legal approval for affiliate/marketplace listings | EXTERNAL BLOCKED |
| Object storage CDN for cached images | EXTERNAL BLOCKED |

---

## Test baseline (pre-phase)

| Gate | Result (rc.3) |
|------|----------------|
| lint / typecheck / test | PASS |
| integrity / security:gate | PASS |
| journey-validation (sandbox PAID) | PASS |
| Playwright purchase flow | PASS |
| Live Daraja STK | NOT VERIFIED |
| Real marketplace source | NOT CONNECTED |

---

## Implementation approach (aligned with prompt)

1. Add `@buying-bot/product-sources` package (port + mock + CSV fixture adapter)
2. Extend Prisma `integrations` schema for sources, sync runs, provenance, price observations
3. Wire ingestion via outbox `product-source.sync` (same pattern as knowledge ingest)
4. Expose admin source APIs + public enriched catalog fields
5. Extend search, AI tools, compare UI
6. Document all EXTERNAL BLOCKED integrations honestly

**No fabricated live marketplace connections.**
