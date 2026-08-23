# Admin-Managed Catalog — Final Report

**Date:** 2026-08-20  
**Business decision:** Buying Bot sells administrator-managed products only. External marketplace ingestion is deferred. Escrow is not implemented (external prerequisite).

**Classification:** **CONDITIONALLY PRODUCTION READY**

---

## 1. Architecture change

Authoritative path is now:

```
ADMIN → INTERNAL CATALOG → STOREFRONT / SEARCH / AI → CART → CHECKOUT → (future escrow)
```

PostgreSQL Product → Variant → SKU → Offer → Inventory remains the source of truth.

## 2. Marketplace integration deprecation

| Item | Status |
|------|--------|
| `@buying-bot/product-sources` | **DEFERRED / FUTURE MARKETPLACE** |
| Default mock/csv/Jumia sources | **Disabled** (`enabled: false`) |
| Public provenance enrichment | **Removed** from customer responses (`provenance: null`) |
| Storefront merchant badges / “View on merchant” | **Removed** |
| Compare page marketplace chrome | **Removed** (admin/demo origin only) |
| AI marketplace narrative | **Forbidden** in system prompt |
| REAL_MARKET_* docs | Superseded for CX by this decision |

## 3. Admin catalog implementation

- Admin list uses `GET /v1/admin/catalog/products` (all lifecycle statuses)
- Create with optional price + stock
- Edit: general, pricing (Offer), media URL, SEO, publish
- Publish validation (name, SKU, active Offer)
- CSV Imports UI + API + worker job `catalog.import`
- Nav: Products, Imports
- SDK: `adminListProducts`, `adminPublishProduct`, offer/media/import helpers

## 4. Product lifecycle

`DRAFT | PENDING_REVIEW | ACTIVE | INACTIVE | ARCHIVED` with publish gates.
Invalid products cannot be activated without required commercial data.

## 5. Product import

`CatalogImport` / `CatalogImportRow` tables; dry-run + async commit via outbox; row-level rejects; import history.

## 6. Media management

Admin can register media (`objectKey` + optional `externalUrl`) with MIME validation. Binary object storage remains an external prerequisite for production uploads.

## 7. Search

Unchanged PostgreSQL FTS on admin catalog products; search index updated on create/update/import.

## 8. AI integration

Tools ground on internal catalog. `getAvailability` uses inventory. `getPriceHistory` uses admin Offer. Prompt states catalog is administrator-managed. Empty catalog → honest “no matching product” behavior (no fabrication).

## 9. Storefront integration

PLP/PDP/compare use Offer price + platform media. Demo/import origin badge only — no marketplace chrome.

## 10. Security

Admin MFA + RBAC + CSRF retained. Publish and import require catalog permissions. Upload MIME allowlist applied to media create.

## 11. Testing

- `catalog-csv.test.ts` — **PASS** (2 tests)
- API + worker typecheck — **PASS** (with temporary Prisma casts until `prisma generate` unlocks)
- E2E: `e2e/admin-catalog-journey.spec.ts` (requires `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`)

## 12. Database changes

Migration `20260820180000_admin_managed_catalog`:

- `catalog.products.content_origin` (`ADMIN|DEMO|IMPORT`)
- `catalog.catalog_imports` / `catalog_import_rows`

Product-source tables retained but unused for CX.
Demo seed: `packages/database/src/seed-demo-catalog.ts` (synthetic DEMO data).

## 13. Documentation changes

- `ADMIN_MANAGED_CATALOG_MIGRATION.md`
- `ADMIN_CATALOG_ARCHITECTURE.md`
- `ADMIN_PRODUCT_MANAGEMENT.md`
- `PRODUCT_IMPORT_GUIDE.md`
- `PRODUCT_MEDIA_GUIDE.md`
- `ADMIN_CATALOG_RUNBOOK.md`
- SRS FR-CAT-011 + business decision
- SDS catalog authority section
- RTM verification rows
- This final report

## 14. Escrow readiness

**Not implemented.** PaymentProvider (M-Pesa) unchanged. Requires later: provider, docs, sandbox/prod credentials, webhooks, settlement, disputes.

**ESCROW INTEGRATION = EXTERNAL PREREQUISITE**

## 15. Remaining external prerequisites

| Prerequisite | Needed for |
|--------------|------------|
| Object storage / CDN credentials | Production binary image uploads |
| Escrow provider package | Escrow checkout |
| Marketplace partnership (optional future) | Deferred aggregation — **not required for current CX** |
| Stop API/worker on Windows → `pnpm run prisma:generate` | Remove temporary client casts after migration |

## 16. Production readiness impact

Positive: single clear catalog ownership; no dependency on Jumia credentials for shopping.  
Gaps: object-storage media binaries; escrow; regenerate Prisma client while services hold the query engine DLL on Windows; full monorepo lint/build/security gate + E2E in target env.

## 17. Verification results (executed 2026-08-20)

| Check | Result |
|-------|--------|
| `prisma generate` | **PASS** (after stopping API/worker file locks) |
| `prisma migrate deploy` | **PASS** (all 7 migrations; fixed enum name mismatch in `20260820140000`) |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| `pnpm lint` | **PASS** |
| `pnpm run integrity` | **PASS** |
| `pnpm run security:gate` | **PASS** |
| Marketplace credentials required for CX | **None** |
| Escrow | **Not implemented** (external prerequisite) |

**Migration fix:** `20260820140000_real_market_catalog_extensions` referenced PascalCase enum `"ProductSourceStatus"` but prior migration created lowercase `product_source_status`. SQL corrected; Prisma enums mapped with `@@map`.

---

## FINAL CLASSIFICATION

**CONDITIONALLY PRODUCTION READY**

Admin-managed catalog is the sole active product source for storefront, search, and AI. Marketplace ingestion is deferred. Escrow is explicitly not implemented. Remaining blockers are external (object storage credentials for binary media uploads; escrow provider package) rather than an incorrect CX architecture or failing local verification gates.
