# Real Product Platform — Final Report

**Date:** 2026-08-20  
**Phase:** Real market product ingestion (foundation)  
**Classification:** **CONDITIONALLY PRODUCTION READY**

> Not **PRODUCTION READY** — no legitimate live marketplace source is connected; M-Pesa live payment not verified.

---

## 1. Architecture reused

- Product → Variant → SKU → Offer → Inventory (ADR-0010)
- Cart / checkout / immutable snapshot (ADR-0011)
- Integer minor units / server-authoritative pricing (ADR-0012)
- AI tools via API — no invented commerce facts (ADR-0015)
- Port → adapter pattern (ADR-0016)
- PostgreSQL outbox + worker polling (existing pattern; BullMQ still not in code)

## 2. Product-source architecture (new)

- Package: `@buying-bot/product-sources`
- Port: `ProductSourcePort` (search, getProduct, health)
- Adapters: **Mock Marketplace (Sandbox)**, **CSV Fixture Feed (Sandbox)**
- Ingestion: `runProductSourceSync` via outbox `product-source.sync`
- Admin: `GET/POST /v1/admin/product-sources`, `POST .../:code/sync`

## 3. Sources implemented vs connected

| Source | Implemented | Connected (live) |
|--------|-------------|------------------|
| mock-marketplace | Yes (fixtures) | **Sandbox only** |
| csv-fixture-feed | Yes (skeleton) | **Sandbox only** |
| Merchant API | Interface only | **EXTERNAL BLOCKED** |
| Affiliate feed | Interface only | **EXTERNAL BLOCKED** |
| Marketplace API | Interface only | **EXTERNAL BLOCKED** |

## 4. Database extensions

- `integrations.product_sources`, `source_sync_runs`, `source_product_records`, `price_observations`
- `catalog.media_assets.external_url`, `attribution`
- Migration: `20260820120000_product_source_provenance`

## 5. Product / offer counts

Run after migration + sync:

```powershell
pnpm migrate:deploy
node --env-file=.env scripts/dev/sync-mock-products.mjs
```

Expected: **4** sandbox source products (Samsung 55" TV, Lenovo laptop, Hisense TV, Nike shoes).

## 6. Real vs synthetic

| Type | Label | Example |
|------|-------|---------|
| Staging seed | TEST | `staging-smoke-sample` |
| Mock ingest | SANDBOX | `src-mock-samsung-55-4k-2024` |
| Live marketplace | — | **None** |

## 7. Image & price provenance

- External image URLs stored on `MediaAsset.externalUrl` + `SourceProductRecord.imageUrl`
- Price observations appended on each sync (`PriceObservation`)
- Compare API returns `priceObservedAt`, `contentOrigin`, `availabilityStatus`

## 8. Search & AI

- Search: price range filters `priceMinMinor` / `priceMaxMinor` on list API
- FTS index enriched on ingest (brand, SKU, GTIN, specs in document text)
- AI tools added: `compareProducts`, `getOffers`
- **Fixed:** RAG retrieve returns `{ citations: [...] }` for ai-service

## 9. Cart / checkout / payment

- Unchanged authoritative flow; checkout revalidates offers server-side
- M-Pesa: sandbox/simulation only — **LIVE PAYMENT NOT VERIFIED**

## 10. Tests

| Suite | Result |
|-------|--------|
| `@buying-bot/product-sources` | 5 passed |
| `@buying-bot/api` | 18 passed (14 skipped integration) |
| Full monorepo | Run `pnpm test` after migration |

## 11. External prerequisites

See [REAL_MARKET_EXTERNAL_PREREQUISITES.md](./REAL_MARKET_EXTERNAL_PREREQUISITES.md).

## 12. Remaining technical blockers

- Apply DB migration in target environments
- Wire real Daraja STK HTTP when shortcode/passkey arrive
- Implement first **REAL_SOURCE** adapter when credentials exist
- Storefront compare UI + product card images (API ready; web partial)
- Admin UI for source dashboard (API only today)
- Freshness STALE thresholds / scheduled sync cron
- Prompt-injection regression tests on malicious product fixtures

## 13. Remaining business blockers

- Merchant/affiliate contracts, image licenses, legal listing approval

## 14. How to test the Samsung TV scenario

```powershell
pnpm migrate:deploy
node --env-file=.env scripts/dev/sync-mock-products.mjs
# Search: GET /v1/search/products?q=Samsung+55+inch+4K+TV&priceMaxMinor=7000000
# Or AI: "Find me a Samsung 55 inch 4K TV under KSh 70,000"
```

## 15. Production classification rationale

**CONDITIONALLY PRODUCTION READY** — commerce core remains verified; real-market ingestion **framework** is in place with honest sandbox data, but **no live product source** or **live M-Pesa** is verified.
