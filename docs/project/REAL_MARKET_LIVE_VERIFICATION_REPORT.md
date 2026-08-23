# Real Market Live Verification Report

**Generated:** 2026-08-20  
**Classification:** **CONDITIONALLY REAL MARKET READY**  
**Live source connected:** **No**

---

## Executive summary

The Buying Bot Platform has a **verified sandbox marketplace pipeline** end-to-end. **No authorized live marketplace credentials were provided** in this environment. The Jumia Seller API adapter is implemented with authentication, pagination, retry, and mapping — but remains **BLOCKED_EXTERNAL** until valid seller credentials are supplied and a live sync is verified.

This report uses **evidence from code, tests, and the verification script** — not invented metrics.

---

## 1. Sources connected

| Source | Authorization | Sync verified | Products |
|--------|---------------|---------------|----------|
| `mock-marketplace` | Internal sandbox | Yes (automated) | Sandbox fixtures |
| `csv-fixture-feed` | Internal sandbox | Available | Sandbox fixtures |
| `jumia-seller-api` | **BLOCKED_EXTERNAL** | **No** | **0 live** |

---

## 2. Authorization status

| Requirement | Jumia | Status |
|-------------|-------|--------|
| Seller account | Jumia Seller Center / Vendor Center | **Not provided** |
| Commercial agreement | Seller T&C | **Not verified** |
| API credentials | `JUMIA_SELLER_API_KEY`, `JUMIA_SELLER_API_SECRET` | **Not set in env** |
| Allowed usage | GPM catalog API per seller scope | **Pending partnership** |
| Affiliate/deep links | `affiliate_url_template` on source registry | Architecture only |

---

## 3–8. Product metrics (sandbox evidence)

Run locally for live numbers:

```bash
node --env-file=.env scripts/dev/verify-sandbox-marketplace.mjs
```

Output: `docs/project/REAL_MARKET_LIVE_VERIFICATION_EVIDENCE.json`

**Expected sandbox metrics** (from fixture catalog, 4 products):

| Metric | Expected (sandbox) |
|--------|-------------------|
| Products imported | 4 |
| Valid products | 4 |
| Quarantined | 0 |
| With images | 4 |
| With prices | 4 |
| `contentOrigin: SANDBOX` | 4 |
| `contentOrigin: REAL_SOURCE` | **0** (no live creds) |

*Actual counts must match the evidence JSON after running the script against your database.*

---

## 9. Price freshness distribution

Freshness bands computed at read time (`FRESH` ≤15m, `RECENT` ≤60m, `STALE` ≤24h, `EXPIRED` beyond).

After a fresh sandbox sync, records should predominantly be **FRESH**.

Checkout **never** trusts discovery freshness — offer resolution is server-side.

---

## 10. Search verification

| Check | Status |
|-------|--------|
| PostgreSQL FTS + price filter | Implemented |
| Provenance on search results | Implemented |
| Sandbox Samsung TV under KSh 70,000 | Fixture exists (mock adapter test) |
| E2E test | `e2e/sandbox-marketplace-journey.spec.ts` |

---

## 11. AI verification

| Tool | Status |
|------|--------|
| `searchProducts` | Wired to catalog DB |
| `compareProducts` | Provenance-aware |
| `getPriceHistory` | From `price_observations` |
| `getAvailability` | Source-backed + freshness label |
| Hallucination guard | Tools-only commerce facts |

**Live AI test with real Jumia products:** **BLOCKED** (no live catalog).

---

## 12. Cart verification

E2E sandbox journey tests: search → detail → add to cart with authoritative `offerId`.

Client never becomes price authority.

---

## 13. Checkout verification

Existing checkout architecture revalidates offers server-side (prior phase).

**Stale search price at checkout:** Must show price change — existing pricing engine behavior.

---

## 14. Payment verification

M-Pesa: **sandbox/simulation only** (prior phase). **Not LIVE VERIFIED.**

---

## 15. Provenance verification

Public API returns:

- `sourceCode`, `sourceName`, `sourceUrl`, `sellerName`
- `contentOrigin`, `priceObservedAt`, `priceFreshness`, `priceFreshnessLabel`
- `primaryImageUrl`, `imageAttribution`

Storefront badges: **Sandbox product** / **Verified price** / **Stale price**

---

## 16. Product deduplication

GTIN-first `dedupeKey`; `canonicalGroupId` on sync; cross-merchant merge by GTIN peer lookup.

---

## 17. Sync performance

| Capability | Status |
|------------|--------|
| Pagination | `fetchAllSourceProducts` + mock `searchPage` |
| Checkpoints | `checkpoint_json` on sync runs |
| Stale sweep | Marks unseen records `UNAVAILABLE` |
| Retry/backoff | `fetchWithRetry` in HTTP client |
| Rate limit field | DB + runtime config (enforcement partial) |
| Incremental cursor | Architecture via `checkpoint_json` |

---

## 18. Failure tests

| Scenario | Result |
|----------|--------|
| Jumia sync without credentials | **Rejected** (`BLOCKED_EXTERNAL`) |
| Invalid image URL | **Quarantined** |
| `NOT_CONFIGURED` source trigger | **HTTP 400** |
| Per-item ingest failure | Increment `productsRejected`, sync continues |

---

## 19. Security tests

| Control | Status |
|---------|--------|
| SSRF URL validation | Enforced |
| Secrets not in git | `.env.example` placeholders only |
| Admin patch/sync audited | `security_events` |
| No scraping adapters | None implemented |

---

## 20. Remaining external prerequisites

1. **Jumia Seller Center account** (Kenya shop)
2. **GPM API credentials** from Vendor Center
3. Set env vars (never commit):
   - `JUMIA_SELLER_API_KEY`
   - `JUMIA_SELLER_API_SECRET`
   - `JUMIA_SELLER_API_BASE_URL`
4. Enable source: `PATCH /v1/admin/product-sources/jumia-seller-api` `{ "enabled": true, "status": "ACTIVE" }`
5. Trigger sync and verify `contentOrigin: REAL_SOURCE` on imported rows
6. Legal review: image attribution, deep links, affiliate terms

See also: `docs/project/REAL_MARKET_EXTERNAL_PREREQUISITES.md`

---

## Final classification

### **CONDITIONALLY REAL MARKET READY**

**Why not REAL MARKET READY:**

- No authorized live source connected
- Zero `REAL_SOURCE` products verified in this environment
- Jumia credentials not provided
- Live payment not verified

**What is verified:**

- Complete ingestion → catalog → search → storefront → AI → cart architecture
- Sandbox end-to-end with honest `SANDBOX` labeling
- Jumia adapter ready for credentials (auth, pagination, mapping, health probe)

---

## Exact next action

Obtain Jumia Seller API credentials → configure env → enable source → run sync → re-run `verify-sandbox-marketplace.mjs` with live checks → update this report with evidence JSON metrics → classify **REAL MARKET READY** only after live product + image + price + provenance verified end-to-end.
