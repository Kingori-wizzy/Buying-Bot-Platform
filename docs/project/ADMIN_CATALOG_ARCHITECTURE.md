# Admin Catalog Architecture

**Business decision (2026-08-20):** Buying Bot’s current product catalog is administered directly by authorized administrators. External marketplace ingestion is deferred. Escrow is an external prerequisite and is not implemented.

## Authoritative journey

```
AUTHORIZED ADMIN
      ↓
INTERNAL PRODUCT CATALOG (PostgreSQL)
      ↓
SEARCH / STOREFRONT / AI
      ↓
CART → CHECKOUT → FUTURE ESCROW PROVIDER
```

## Domain model (retained)

Product → Variant → SKU → Offer → Pricing engine  
Inventory balances + movements  
MediaAsset (platform-managed)  
ProductSearchDocument (PostgreSQL FTS)

## Content origin

| Value | Meaning |
|-------|---------|
| `ADMIN` | Created/edited by administrators |
| `DEMO` | Staging/demo synthetic catalog |
| `IMPORT` | Created via CSV import (still admin-managed) |

Marketplace `SourceContentOrigin` tables remain in schema for **FUTURE MARKETPLACE INTEGRATION** only and are not used in the customer journey.

## Deferred packages

`@buying-bot/product-sources` (mock, CSV fixture, Jumia shell) is **DEFERRED**. Default sources are disabled. Do not sync marketplace fixtures into the customer catalog.

## Escrow

**EXTERNAL PREREQUISITE.** PaymentProvider remains M-Pesa/sandbox. Do not invent escrow APIs or credentials.
