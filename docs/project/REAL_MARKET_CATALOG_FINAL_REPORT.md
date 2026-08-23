# Real Market Catalog — Final Report

**Date:** 2026-08-20  
**Classification:** **CONDITIONALLY REAL MARKET READY**

---

## 1. Existing architecture

Accepted ADRs, PostgreSQL catalog, FTS search, AI tool runtime, cart/checkout with server-side pricing — unchanged. Real-product ingestion added in prior phase via `ProductSourcePort` and provenance tables.

## 2. Implemented source adapters

| Adapter | Mode |
|---------|------|
| Mock Marketplace | SANDBOX · TESTED |
| CSV Fixture Feed | SANDBOX |
| Jumia Seller API | SHELL · NOT_CONFIGURED |

## 3. Real providers researched

See `REAL_MARKET_SOURCE_MATRIX.md` — Jumia Seller Center/GPM, Kilimall (no public API), Masoko, affiliate networks.

## 4. Providers actually configured

**None live.** Sandbox sources only (`mock-marketplace`, `csv-fixture-feed`).

## 5. Providers requiring credentials

- Jumia GPM / Seller API (`JUMIA_SELLER_API_*`)
- Generic merchant APIs (per `.env.example`)
- Affiliate network keys

## 6. Product normalization

Strict `NormalizedSourceProduct` Zod schema; quarantine gate rejects invalid rows.

## 7. Deduplication

GTIN-first `dedupeKey`; sync links canonical peers via `canonicalGroupId`; multiple offers per canonical product supported.

## 8. Price provenance

Append-only `price_observations`; `getPriceHistory` exposes min/max from stored observations only.

## 9. Image provenance

`media_assets.external_url` + `attribution`; SSRF validation; storefront renders source URLs.

## 10. Search

PostgreSQL FTS + post-filter price bounds.

## 11. AI shopping

Tools: `searchProducts`, `getProduct`, `getOffers`, `compareProducts`, `getPriceHistory`, `getAvailability` — factual fields from API only.

## 12. Comparison

`compareProducts` includes provenance + freshness on each row.

## 13. Cart

Unchanged — resolves authoritative offer at add/checkout.

## 14. Checkout

Unchanged — server price validation; stale discovery prices not auto-payable.

## 15. Payment integration

M-Pesa sandbox partial (prior phase); not part of catalog phase.

## 16. Affiliate architecture

`affiliate_url_template` on source registry; no fabricated tracking params.

## 17. Data freshness

Configurable bands; UI labels; AI should cite `priceFreshnessLabel` when STALE/EXPIRED.

## 18. Security

SSRF URL validation, quarantine, credential isolation, no HTML execution from feeds.

## 19. Tests

Product-sources unit tests including freshness/quarantine; platform gates to be run locally.

## 20. Performance

Sync processes items individually — one bad row quarantined, not full batch failure.

## 21. External blockers

| Blocker | Owner |
|---------|-------|
| Jumia seller credentials | Merchant/partnerships |
| Kilimall API access | No public API |
| Affiliate approvals | Network onboarding |
| Image licensing | Legal |

## 22. Recommended next actions

1. **Obtain Jumia Seller Center API access** for Kenya shop  
2. Set env vars; enable `jumia-seller-api`; run sync + manual verification  
3. Legal sign-off on attribution/affiliate terms  
4. Add admin UI for source health (optional)  
5. Wire price alert worker to `price_observations` stream  

---

## Live vs sandbox summary

| Source | Label |
|--------|-------|
| mock-marketplace | **SANDBOX** |
| csv-fixture-feed | **SANDBOX** |
| jumia-seller-api | **EXTERNAL_PREREQUISITE** |
| All others | **NOT CONFIGURED** |

## Exact next action for first real marketplace

**Sign Jumia seller agreement → provision GPM API key → set `JUMIA_SELLER_API_*` → enable source → sync → verify Samsung (or equivalent) product end-to-end with `contentOrigin: REAL_SOURCE`.**

Do **not** claim REAL MARKET READY until that verification completes.
