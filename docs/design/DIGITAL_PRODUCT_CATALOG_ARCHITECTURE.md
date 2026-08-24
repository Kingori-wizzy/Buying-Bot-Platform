# Digital product catalog architecture

**Business rule:** The shop sells **admin-managed digital products**. PostgreSQL is the system of record. External marketplace ingestion is deferred and disabled by default.

## Source of truth

```text
Admin UI → Catalog API → PostgreSQL → Storefront / Search / AI / Cart / Checkout
```

Customers never create categories or invent prices. The AI must call catalog tools only.

## Taxonomy

Five seeded root categories (idempotent on API boot):

1. AI Platforms (`ai-platforms`)
2. Payout Platforms (`payout-platforms`)
3. Academic Writing Accounts (`academic-writing-accounts`)
4. Survey Platforms (`survey-platforms`)
5. Chat Moderation Platforms (`chat-moderation-platforms`)

Hierarchy: Category → Subcategory (`parentId`) → Product (`primaryCategoryId`) → Variant → SKU → Offer.

Public routes:

- `/category/[slug]`
- `/products/[slug]`

## Product model (extensions)

Existing Product → Variant → SKU → Offer retained.

Added on Product:

- `productKind` (default `DIGITAL`)
- `digitalType`
- `featuresJson`, `requirementsText`, `instructionsText`, `metadataJson`

Added on Offer:

- `inventoryMode` (`FINITE` | `UNLIMITED` | `MANUAL`)
- `deliveryMethod`
- `validityDays`
- `fulfillmentHintsJson` (non-secret)

## Lifecycle

`DRAFT` → `ACTIVE` (published) → `INACTIVE` / `ARCHIVED`

Only `ACTIVE` appears in the public shop.

## Digital fulfillment

After verified Escrow payment:

`PENDING_PAYMENT` → `PAID` → `PROCESSING` (+ `DigitalFulfillment` rows) → `FULFILLING` → `COMPLETED`

Sensitive credentials must never be logged or stored in cleartext password/secret fields.

## Marketplace (deferred)

`packages/product-sources` remains in the monorepo but:

- sources default `enabled: false`
- `MARKETPLACE_INGESTION_ENABLED` must be `true` to trigger sync
- production shop does not require Jumia/Kilimall/feeds
