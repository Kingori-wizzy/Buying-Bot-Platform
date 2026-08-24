# Admin product management (digital catalog)

## Create taxonomy

1. Open Admin → Catalog → Brands & categories
2. Root categories are seeded: AI Platforms, Payout Platforms, Academic Writing Accounts, Survey Platforms, Chat Moderation Platforms
3. Create a subcategory by selecting a parent category

## Create a digital product

1. Catalog → New product
2. Select main category (and optional subcategory)
3. Enter name / description
4. Choose digital type
5. Set price (minor units), inventory mode, delivery method
6. Save as DRAFT or ACTIVE (ACTIVE requires price)
7. On product edit: upload images, publish/unpublish/archive

## Publish rules

Only ACTIVE products appear on the storefront. Prices are Offer-based and server-authoritative.

## Marketplace sync

Do not use product-source sync for the shop. It is blocked unless `MARKETPLACE_INGESTION_ENABLED=true` (deferred).
