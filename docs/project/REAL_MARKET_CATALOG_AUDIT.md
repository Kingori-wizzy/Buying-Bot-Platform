# Real Market Catalog Audit

**Date:** 2026-08-20  
**Scope:** M0–M25 platform + real-product ingestion foundation → production-grade real marketplace catalog architecture

## Executive summary

The Buying Bot Platform has a **working sandbox ingestion pipeline** (`@buying-bot/product-sources`) with provenance tables, worker sync, compare API, and partial AI/storefront integration. **No live merchant or marketplace is configured or verified.** This phase extends registry, freshness, quarantine, provenance on public catalog APIs, storefront badges, and external adapter shells without fabricating live data.

**Classification:** **CONDITIONALLY REAL MARKET READY** — architecture complete for first live source once credentials/partnerships exist.

---

## What already works

| Area | Status | Notes |
|------|--------|-------|
| `ProductSourcePort` | ✅ | Mock + CSV sandbox adapters |
| Normalized product schema | ✅ | Zod contract in `types.ts` |
| GTIN-first dedupe key | ✅ | `buildDedupeKey()` |
| SSRF-safe URL validation | ✅ | `validate.ts` |
| DB provenance | ✅ | `product_sources`, `source_sync_runs`, `source_product_records`, `price_observations` |
| Worker ingestion | ✅ | `product-source.sync` outbox handler |
| Admin source API | ✅ | list + trigger sync |
| Compare API | ✅ | `POST /v1/products/compare` with provenance |
| AI tools | ✅ | `searchProducts`, `getProduct`, `compareProducts`, `getOffers` |
| RAG citations | ✅ | Fixed `{ citations: [...] }` shape |
| Price filter (list) | ✅ | `priceMinMinor` / `priceMaxMinor` on `/v1/products` |
| Sandbox fixtures | ✅ | Samsung 55" TV KSh 64,999, `contentOrigin: SANDBOX` |
| Checkout/cart | ✅ | Server-side price resolution (prior phase) |

---

## Sandbox-only (not live)

- **Mock Marketplace** (`mock-marketplace`) — JSON fixtures, `example.com` URLs
- **CSV Fixture Feed** — local CSV adapter
- **M-Pesa** — sandbox/simulated STK only
- **Storefront placeholder thumbs** — replaced in this phase with `externalUrl` when present
- **Assistant client-side search hydration** — supplements AI stream; tool cards still rely on structured API fields

---

## Production-ready after this phase

| Capability | Implementation |
|------------|----------------|
| Extended source registry | `enabled`, `priority`, `countryCode`, `syncIntervalMinutes`, `healthStatus`, `NOT_CONFIGURED` |
| Price freshness bands | `FRESH` / `RECENT` / `STALE` / `EXPIRED` (config-driven) |
| Quarantine | `quarantined_source_products` + validation gate |
| Canonical dedupe on sync | GTIN peer linking + `canonicalGroupId` |
| Re-sync refresh | Search index + media on update |
| Public provenance | `provenance`, `primaryImageUrl` on list/get |
| Search + price filter | Post-FTS price filter |
| AI `getPriceHistory` / `getAvailability` | Authoritative tool handlers |
| Jumia adapter shell | `NOT_CONFIGURED` until env credentials |
| Price alerts entity | Schema only (worker trigger deferred) |
| Demo mode UI badges | LIVE / SANDBOX / STALE |

---

## Incomplete / deferred

| Gap | Priority |
|-----|----------|
| Live Jumia/Kilimall/other merchant sync | **EXTERNAL** — credentials + contracts |
| Affiliate URL transformation | Interface + env only |
| Price alert worker notifications | Entity created; job not wired |
| Admin UI for product sources | API only |
| Elasticsearch | Not authorized by ADR — PostgreSQL FTS retained |
| Image CDN caching | External license + storage |
| Full rate-limit/retry adapter base class | Partial via source `rateLimitPerMinute` |

---

## Missing source adapters (by design)

All require **REQUIRES_CREDENTIALS** or **REQUIRES_PARTNERSHIP**:

- Jumia Seller Center / GPM API (shell implemented)
- Kilimall merchant CSV/API (not implemented — no public competitor API)
- Generic affiliate networks (Awin, CJ, etc.) — documentation only
- Individual Kenya retailers — merchant agreements required

---

## Risks

1. **Mislabeling sandbox as live** — mitigated by `contentOrigin` + UI badges
2. **Stale prices at checkout** — checkout must revalidate (existing architecture)
3. **Scraping temptation** — explicitly out of scope; no scraper adapters
4. **SSRF via merchant URLs** — `isSafePublicHttpUrl` enforced
5. **Duplicate products across merchants** — canonical dedupe reduces but multi-offer per SKU still evolving

---

## Recommended next action

1. Obtain **Jumia Seller Center API** credentials for a authorized seller account  
2. Set `JUMIA_SELLER_*` env vars and enable `jumia-seller-api` source  
3. Run sync + verify end-to-end: search → PDP → compare → cart → checkout  
4. Legal review of image/link attribution per Jumia terms
