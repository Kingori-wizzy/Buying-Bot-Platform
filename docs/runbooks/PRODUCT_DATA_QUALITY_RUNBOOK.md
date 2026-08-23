# Product Data Quality Runbook

## Quarantine reasons

| Reason | Typical cause | Fix |
|--------|---------------|-----|
| `MISSING_IDENTITY` | Empty title/sourceProductId | Fix upstream feed |
| `INVALID_PRICE` | Non-positive amountMinor | Correct merchant feed |
| `UNSUPPORTED_CURRENCY` | Non-KES without approval | Extend allowed list or convert at source |
| `INVALID_IMAGE_URL` | SSRF/localhost URL | Use HTTPS public CDN URL |
| `INVALID_SOURCE_URL` | Blocked URL pattern | Allowlist domain or fix feed |
| `INVALID_GTIN` | Malformed barcode | Correct GTIN at source |
| `MISSING_PROVENANCE` | Missing sellerName | Require merchant attribution |

## Inspect quarantine

```sql
SELECT reason, detail, created_at, raw_snapshot_json
FROM integrations.quarantined_source_products
ORDER BY created_at DESC
LIMIT 50;
```

## Price freshness

- Discovery UI shows `priceFreshnessLabel`  
- **STALE/EXPIRED** → AI must warn price may have changed  
- Checkout always calls pricing engine / offer resolution  

## Deduplication

- Same GTIN from multiple merchants → one canonical product, multiple offers  
- Never merge on fuzzy title alone  
- Check `canonical_group_id` on `source_product_records`  

## Image policy

- Prefer `media_assets.external_url` with `attribution`  
- Do not copy images to object storage without license  
- Reject non-HTTPS or internal URLs  

## Monitoring metrics (recommended)

- `products_fetched`, `products_accepted`, `products_rejected` per sync  
- Quarantine rate by reason  
- Stale price percentage (`priceObservedAt` age)  
- Image validation failures  

## Escalation

1. Source merchant feed owner  
2. Platform admin disables source (`status=PAUSED`)  
3. Legal review if attribution/terms unclear  
