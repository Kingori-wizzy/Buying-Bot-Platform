# Product Source Sync Runbook

## Prerequisites

- PostgreSQL migrated (`pnpm migrate:deploy`)
- Worker running (`SERVICE_NAME=worker`)
- API running (`SERVICE_NAME=api`, `PORT=3000`)

## Sandbox sync (safe demo)

```bash
node scripts/dev/sync-mock-products.mjs
```

Expected:

- `mock-marketplace` sync run → `SUCCESS`
- Products appear in catalog with `contentOrigin: SANDBOX`
- Samsung TV fixture ~ KSh 64,999

## Admin trigger

```http
POST /v1/admin/product-sources/mock-marketplace/sync
Authorization: admin session + CSRF
```

## Monitor

```http
GET /v1/admin/product-sources
GET /v1/admin/product-sources/mock-marketplace/sync-runs
```

Check:

- `productsAccepted` / `productsRejected`
- `healthStatus`
- `lastError`

## Failure recovery

| Symptom | Action |
|---------|--------|
| `SOURCE_DISABLED` | Enable source: `enabled=true`, `status=ACTIVE` |
| `NOT_CONFIGURED` | Set provider env vars; enable source |
| High `productsRejected` | Inspect `integrations.quarantined_source_products` |
| `FAILED` sync | Read `source_sync_runs.error_message`; fix adapter/config |
| Stale catalog | Re-trigger sync; verify `product_search_documents` updated |

## Live source onboarding (when credentials available)

1. Add env vars (never commit)  
2. Set source `enabled=true`, `status=ACTIVE`  
3. Trigger sync  
4. Verify health `HEALTHY`  
5. Validate PDP provenance + checkout price revalidation  
6. Mark **LIVE VERIFIED** in source matrix doc only after step 5  

## Do not

- Scrape merchant websites  
- Mark sandbox sync as live  
- Use historical observation as payable checkout price without revalidation  
