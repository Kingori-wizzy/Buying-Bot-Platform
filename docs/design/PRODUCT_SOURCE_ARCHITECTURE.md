# Product Source Architecture

**Status:** Implemented (sandbox adapters)  
**Aligns with:** ADR-0010, ADR-0016

## Port pattern

```
Domain / API → ProductSourcePort (packages/product-sources)
                    → MockMarketplaceAdapter | CsvFeedAdapter | (future Merchant API)
                    → NormalizedSourceProduct (validated, SSRF-safe URLs)
                    → runProductSourceSync (async via outbox + worker)
                    → Catalog Product / Variant / SKU / Offer + provenance tables
```

Domain code **never** imports provider SDK types.

## Data flow

1. Admin triggers `POST /v1/admin/product-sources/:code/sync`
2. API creates `SourceSyncRun` + outbox `product-source.sync`
3. Worker calls `runProductSourceSync`
4. Adapter fetches normalized products (sandbox fixtures today)
5. Upsert catalog + `SourceProductRecord` + `PriceObservation`
6. Search index updated on product create/update

## Freshness

`SourceFreshnessStatus`: VERIFIED | STALE | UNAVAILABLE | UNKNOWN  
Stored on `SourceProductRecord`; exposed via compare API and provenance fields.

## External sources

Real merchant/affiliate/marketplace adapters require credentials — see [REAL_MARKET_EXTERNAL_PREREQUISITES.md](../project/REAL_MARKET_EXTERNAL_PREREQUISITES.md).
