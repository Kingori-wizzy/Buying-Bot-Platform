# Real Market Catalog Architecture

## Pipeline

```
Product Source (DB registry)
        ↓
Source Adapter (ProductSourcePort)
        ↓
Validate + Quarantine gate
        ↓
Normalize (NormalizedSourceProduct)
        ↓
Dedupe (GTIN → brand+model → source id)
        ↓
Canonical product + offer upsert
        ↓
Price observation append
        ↓
Media (externalUrl + attribution)
        ↓
Search document refresh
        ↓
Public catalog API (+ provenance enrichment)
        ↓
Storefront / AI tools / Compare / Cart / Checkout
```

## Source adapter isolation

- Adapters live in `@buying-bot/product-sources`
- Domain code (`catalog`, `carts`, `checkout`) never imports provider SDK types
- External sources without credentials register as `NOT_CONFIGURED` and return health errors — **no fabricated catalog**

## Provenance model

Every source-backed SKU links via `integrations.source_product_records`:

- `sourceUrl`, `sellerName`, `contentOrigin`, `priceObservedAt`
- `canonicalGroupId` for cross-merchant GTIN grouping
- `price_observations` append-only history

## Price truth layers

| Layer | Authority | Use |
|-------|-----------|-----|
| Discovery display | Latest observation + freshness band | Search, AI cards, PLP |
| Payable price | Offer + pricing engine at checkout | Cart/checkout only |
| AI narrative | Tool results only | No invented KES amounts |

Freshness bands (configurable via env):

- **FRESH** — default ≤15 min  
- **RECENT** — default ≤60 min  
- **STALE** — up to 24 h  
- **EXPIRED** — beyond 24 h  

## Security

- SSRF-safe URL validation on source and image URLs  
- Secrets in env only (see `.env.example`)  
- Quarantine for invalid normalized rows  
- No HTML execution from feeds  

## Demo mode

UI badges:

- **Verified merchant price** (`FRESH`, `REAL_SOURCE`)  
- **Sandbox product** (`SANDBOX` / `DEMO`)  
- **Stale price** (`STALE` / `EXPIRED`)  

## Extension points

- `JumiaSellerApiAdapter` — enable when `JUMIA_SELLER_*` set  
- Affiliate URL template on `product_sources.affiliate_url_template`  
- `price_alerts` for future notification worker  
