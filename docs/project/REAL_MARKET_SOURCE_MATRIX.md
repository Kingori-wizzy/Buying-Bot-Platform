# Real Market Source Matrix (Kenya-focused)

**Last updated:** 2026-08-20  
**Rule:** Never label **LIVE** unless configured and verified in this environment.

| Source | Type | Official API / feed | Auth | Commercial requirement | Product fields | Price | Images | Stock | Refresh limits | Contractual | Status |
|--------|------|---------------------|------|------------------------|----------------|-------|--------|-------|----------------|-------------|--------|
| **Mock Marketplace** | MOCK | Internal JSON fixtures | None | None (dev only) | name, brand, GTIN, price, URL, image | ✅ Sandbox | ✅ Sandbox | ✅ Sandbox | N/A | Internal | **IMPLEMENTED · TESTED · SANDBOX** |
| **CSV Fixture Feed** | CSV_FEED | Local CSV path in config | None | None (dev only) | Same as normalized schema | ✅ Fixture | ✅ Fixture | ✅ Fixture | Manual sync | Internal | **IMPLEMENTED · SANDBOX** |
| **Jumia Seller Center (Legacy)** | MARKETPLACE_API | [Seller API](http://sellerapi.sellercenter.jumia.com/) | UserID + API key + HMAC signature | Registered Jumia seller | Seller-owned SKUs, feeds async | ✅ Seller sets | ✅ Seller uploads | ✅ Seller inventory | 50 feeds/day; inventory 5×/day | [Seller T&C](https://sellercenter.jumia.com/) | **IMPLEMENTED (shell) · REQUIRES_CREDENTIALS · NOT_CONFIGURED** |
| **Jumia GPM / Vendor API** | MARKETPLACE_API | [GPM PDF](http://file.jumia-global.com.cn/jumia/rich_text/b2cfe682-4c85-4e42-83b6-53c31bf65b29.pdf) — `vendor-api.jumia.com` | API key (per GPM doc) | Jumia vendor / mastershop | GET `/catalog/products`, feed-based create/update | ✅ Via seller | ✅ Via seller | ✅ Via seller | Feed throttling per Seller Center | Vendor agreement | **REQUIRES_PARTNERSHIP · REQUIRES_CREDENTIALS · DEFERRED** |
| **Kilimall** | MARKETPLACE_API | No public product API for third-party discovery | Unknown for affiliates | Merchant/seller onboarding | Unknown without contract | Unknown | Unknown | Unknown | Unknown | Merchant agreement | **NOT_SUPPORTED (no authorized public API)** |
| **Masoko (Safaricom)** | MARKETPLACE_API | Closed vendor program | Vendor portal | Safaricom vendor onboarding | Unknown | Unknown | Unknown | Unknown | Unknown | Vendor contract | **REQUIRES_APPROVAL · DEFERRED** |
| **Awin / CJ / ShareASale** | AFFILIATE_FEED | Network product APIs (region-dependent) | Publisher API key | Affiliate publisher approval | Varies by advertiser | Often ✅ | Often ✅ | Varies | Network ToS | Affiliate agreement | **REQUIRES_PARTNERSHIP · EXTERNAL_PREREQUISITE** |
| **Individual retailer APIs** | MERCHANT_API | Per-merchant | API key/OAuth | Direct merchant contract | Varies | ✅ if provided | ✅ if licensed | ✅ if provided | Per contract | Merchant DPA | **REQUIRES_PARTNERSHIP · NOT IMPLEMENTED** |
| **Website scraping** | — | — | — | — | — | — | — | — | — | **Prohibited without explicit permission** | **NOT_SUPPORTED** |

## Status legend

| Status | Meaning |
|--------|---------|
| **IMPLEMENTED** | Adapter/code path exists in repo |
| **CONFIGURED** | Env vars set (secrets not in git) |
| **TESTED** | Automated tests pass against sandbox |
| **LIVE VERIFIED** | End-to-end sync with real merchant data verified |
| **SANDBOX** | Fixture/demo data only |
| **REQUIRES_CREDENTIALS** | Waiting on API keys |
| **REQUIRES_PARTNERSHIP** | Waiting on commercial/affiliate approval |
| **EXTERNAL_PREREQUISITE** | Blocked on external party |
| **NOT_SUPPORTED** | No authorized technical path |

## Kenya priority order (recommended)

1. **Authorized seller/marketplace API** (Jumia GPM once seller account exists)  
2. **Direct merchant CSV/JSON feeds** (contractual, attribution documented)  
3. **Affiliate product APIs** where Kenya advertisers exist  
4. **Manual merchant onboarding** via `MERCHANT_API` adapter template  

## What we do not claim

- Millions of real products without underlying sources  
- Live Jumia/Kilimall prices without credentials  
- Public website HTML as an API  
