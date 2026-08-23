# Real Market External Prerequisites — Live Integration

**Last updated:** 2026-08-20  
**Live integration status:** **BLOCKED_EXTERNAL**

---

## Jumia Seller Center / GPM API (first recommended live source)

| Item | Detail |
|------|--------|
| **Account required** | Jumia Seller Center / Vendor Center seller account with Kenya shop |
| **Agreement required** | Jumia seller terms + API usage policy |
| **API access** | GPM API (`vendor-api.jumia.com`) — see [GPM documentation](http://file.jumia-global.com.cn/jumia/rich_text/b2cfe682-4c85-4e42-83b6-53c31bf65b29.pdf) |
| **Credentials** | `JUMIA_SELLER_API_KEY`, `JUMIA_SELLER_API_SECRET`, optional `JUMIA_SELLER_API_BASE_URL` |
| **Webhooks** | Not required for catalog read sync; order webhooks separate |
| **Allowed usage** | Seller-owned catalog only — **not** competitor price scraping |
| **Affiliate** | Deep links via `affiliate_url_template` on `product_sources` — configure after program approval |
| **Rate limits** | Seller Center feed throttling (see Seller API docs); adapter uses retry + configurable page size |
| **Commercial** | Seller commission/fees per Jumia contract |

### Enable checklist (when credentials exist)

1. Add credentials to `.env` (never commit)
2. `pnpm migrate:deploy` if pending migrations
3. Restart API + worker
4. Verify health: adapter `health()` returns `ok: true`
5. `PATCH /v1/admin/product-sources/jumia-seller-api` → `{ "enabled": true, "status": "ACTIVE" }`
6. `POST /v1/admin/product-sources/jumia-seller-api/sync`
7. Confirm `integrations.source_product_records.content_origin = REAL_SOURCE`
8. Run `node --env-file=.env scripts/dev/verify-sandbox-marketplace.mjs` with live checks added

---

## Other sources

| Provider | Blocker |
|----------|---------|
| Kilimall | No authorized public product API |
| Masoko | Closed vendor program |
| Affiliate networks | Publisher approval + API keys |
| Generic merchants | Direct contract + feed URL |

---

## What the platform does without credentials

- Sandbox sync (`mock-marketplace`) — fully tested
- Jumia adapter shell — auth, pagination, mapping, health probe
- Admin stats, quarantine list, patch enable/disable (audited)
- Verification script + E2E sandbox journey
- Honest `BLOCKED_EXTERNAL` / `NOT_CONFIGURED` status — **never fabricates live data**

---

## Security

- Never commit API keys, secrets, tokens, or passwords
- Use `.env.example` placeholders only
- Admin actions logged to `audit.security_events`
