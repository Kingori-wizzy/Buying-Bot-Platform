# Admin-Managed Catalog Migration

**Date:** 2026-08-20  
**Business decision:** Buying Bot’s current product catalog is administered directly by authorized administrators. External marketplace ingestion is deferred. Escrow is an external prerequisite and must not be implemented yet.

**Authoritative journey:**

```
AUTHORIZED ADMIN
      ↓
INTERNAL PRODUCT CATALOG (PostgreSQL)
      ↓
SEARCH / STOREFRONT / AI
      ↓
CART → CHECKOUT → FUTURE ESCROW PROVIDER
```

---

## 1. What exists

### Catalog core (retain)

| Layer | Location | Notes |
|-------|----------|-------|
| Schema | `packages/database/prisma/schema.prisma` | Product → Variant → Sku → Offer → Inventory; MediaAsset; ProductSearchDocument |
| Lifecycle enum | `ProductLifecycle` | `DRAFT \| PENDING_REVIEW \| ACTIVE \| INACTIVE \| ARCHIVED` |
| Admin API | `apps/api/src/catalog/catalog.admin.controller.ts` | Create/update product, brands, categories, offers, media metadata |
| Public API | `apps/api/src/catalog/catalog.public.controller.ts` | List/get/search/compare (ACTIVE only) |
| Admin UI | `apps/admin/app/catalog/*` | Thin create + edit (name/description/status) |
| Inventory UI | `apps/admin/app/inventory/page.tsx` | List + adjust by SKU id |
| Storefront | `apps/web` | PLP/PDP/search/compare/cart/checkout |
| AI tools | `apps/api/src/ai/ai.service.ts` | searchProducts, getProduct, getOffers, compareProducts, getPriceHistory, getAvailability |
| Payments | `PaymentProvider` + M-Pesa | No escrow |

### Marketplace / product-sources (active but wrong for CX)

| Layer | Location |
|-------|----------|
| Package | `packages/product-sources` (mock, CSV fixture, Jumia shell) |
| Ingest | `run-sync.ts` upserts catalog + provenance |
| Worker | `product-source.sync` outbox handler |
| Admin API | `/v1/admin/product-sources/*` (no admin UI) |
| DB | `ProductSource`, `SourceSyncRun`, `SourceProductRecord`, `PriceObservation`, quarantine, price alerts |
| Storefront UX | Provenance badges, “View on merchant”, freshness labels |
| Scripts | `sync-mock-products.mjs`, `verify-sandbox-marketplace.mjs` |
| Docs | `REAL_MARKET_*.md` claiming conditional marketplace readiness |

### Gaps for admin-managed commerce

- Admin list uses **public** ACTIVE-only API (drafts hidden)
- No SDK `adminListProducts`
- No offer/price UI; create product does not create Offer
- No media file upload (metadata-only API; upload-validation unused)
- No variant editor beyond auto-Default
- No publish validation gates
- No CSV bulk import / import history
- No brands/categories admin UI
- Provenance/marketplace chrome still customer-facing

---

## 2. What should be retained

- Product → Variant → Sku → Offer → Pricing → Inventory architecture (ADR-aligned)
- PostgreSQL FTS / search documents
- Public catalog ACTIVE filter
- Cart/checkout server-side price resolution
- Inventory balances + movements
- MediaAsset model (platform-managed object keys)
- Admin RBAC / CSRF / MFA patterns
- M-Pesa PaymentProvider port (no escrow)
- Staging smoke seed as **DEMO** data (clearly labeled)

---

## 3. What should be deprecated

| Item | Action |
|------|--------|
| Customer-facing provenance badges / merchant links | Remove from storefront active UX |
| Default-enabled mock/csv product sources seeding ACTIVE catalog | Disable from customer journey |
| Worker sync writing storefront products for CX | Gate / no-op for default customer path OR leave package deferred |
| AI `getAvailability` / `getPriceHistory` requiring SourceProductRecord | Redefine against inventory + offers |
| REAL_MARKET “next step = Jumia credentials” as CX plan | Supersede with admin-managed decision |
| Jumia env as production requirement | Document as FUTURE MARKETPLACE only |

---

## 4. What should be removed from active runtime

- Storefront reliance on `provenance`, `primaryImageUrl` from external URLs as “merchant price”
- Auto-sync of mock marketplace into production-looking catalog without DEMO labeling
- Misleading UI copy implying live marketplace aggregation

**Do not delete** `packages/product-sources` in this phase — mark **DEFERRED / FUTURE MARKETPLACE INTEGRATION**.

---

## 5. What should be converted into admin functionality

| From | To |
|------|----|
| CSV fixture adapter ideas | Admin CSV product import |
| Quarantine / validation | Import row validation + error report |
| MediaAsset.externalUrl | Prefer platform `objectKey` for admin uploads; external URL optional for DEMO only |
| Thin product editor | Full merchandising editor: General, Media, Pricing, Inventory, SEO, Publish |

---

## 6. Database migration requirements

| Change | Required? |
|--------|-----------|
| Product/Variant/Sku/Offer/Inventory | Reuse existing |
| `CatalogImport` + `CatalogImportRow` (or similar) | **Yes** — bulk import history |
| ProductSource tables | Keep; not used for CX |
| Content origin on Product | Optional flag `contentOrigin` DEMO vs ADMIN — preferred for clarity |
| Destructive drops | **No** |

---

## 7. API changes

| Change | Detail |
|--------|--------|
| SDK `adminListProducts` | Wire to `GET /v1/admin/catalog/products` |
| Publish validation | Reject ACTIVE without offer / SKU / required fields |
| Media upload | Presigned upload or multipart using existing upload-validation |
| Inventory | Keep adjust; improve product-linked UX |
| Catalog import | `POST /v1/admin/catalog/imports` (dry-run + commit) + worker job |
| Product-sources | Remain admin/ops; document deferred; do not expand CX |
| Public catalog | Stop attaching marketplace provenance by default (or only when REAL_SOURCE and feature enabled — default off) |

---

## 8. Frontend changes

### Admin

- Product table: image, name, SKU, category, price, stock, status, actions
- Product editor sections: General, Media, Variants/SKU, Pricing, Inventory, SEO, Publishing
- Brands / Categories management
- Product Imports page
- Nav: Catalog, Brands, Categories, Imports (Inventory/Orders already exist)

### Storefront

- Remove sandbox/verified-merchant/stale marketplace badges from PLP/PDP
- Show platform media + Offer price + inventory availability
- Keep compare as internal catalog compare

---

## 9. AI changes

| Tool | Change |
|------|--------|
| searchProducts / getProduct | Internal catalog only; no marketplace narrative |
| getOffers | Offer data; drop marketplace provenance requirement |
| getAvailability | Inventory balances for product SKUs |
| getPriceHistory | Offer/list price history if available; else “not tracked” — do not require SourceProductRecord |
| compareProducts | Internal products only |
| Prompts | State catalog is administrator-managed |

---

## 10. Tests that need updating

- Admin create → publish → public list
- Publish validation failures
- Inventory adjust audit
- Media create/link
- CSV import dry-run / commit / rejects
- Storefront without provenance badges
- AI search grounded in admin product
- E2E: ADMIN CREATE → PUBLISH → CUSTOMER SEARCH → AI → CART → CHECKOUT
- Security: unauthorized catalog mutations
- Deprecate marketplace-journey E2E as primary CX (keep as deferred sandbox)

---

## Escrow

**EXTERNAL PREREQUISITE.** Do not implement. PaymentProvider remains M-Pesa/sandbox. Document later: provider docs, credentials, webhooks, settlement, disputes.

---

## Implementation order (post-audit)

1. Deprecate provenance from public/storefront/AI default path  
2. Fix admin list + expand product editor (offer, inventory link, publish gates)  
3. Media upload path + primary image  
4. CSV import + worker + history  
5. Demo seed labeled DEMO  
6. Docs + final report + verification  

**Classification target after implementation:** CONDITIONALLY PRODUCTION READY (admin catalog complete; escrow external; object storage may need real credentials for production media).
