# Product Source Architecture

**Status:** DEFERRED / FUTURE MARKETPLACE INTEGRATION  
**Shop catalog authority:** Admin-managed digital products in PostgreSQL — see [DIGITAL_PRODUCT_CATALOG_ARCHITECTURE.md](./DIGITAL_PRODUCT_CATALOG_ARCHITECTURE.md)

Marketplace adapters remain in the monorepo for future use but are **not** on the production purchasing path.

## Gate

- Sources default `enabled: false`
- `MARKETPLACE_INGESTION_ENABLED` must be `true` to trigger sync (default `false`)
- Production shop must work with zero Jumia/Kilimall/feed credentials

## Port pattern (deferred)

```
Domain / API → ProductSourcePort (packages/product-sources)
                    → MockMarketplaceAdapter | CsvFeedAdapter | (future Merchant API)
                    → NormalizedSourceProduct
                    → Catalog Product / Variant / SKU / Offer + provenance tables
```

Do not enable marketplace ingestion for the digital products shop without explicit business approval.
