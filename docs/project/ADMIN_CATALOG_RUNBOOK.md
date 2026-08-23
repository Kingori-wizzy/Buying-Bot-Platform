# Admin Catalog Runbook

## Create & publish a product

1. Log in to Admin (MFA)  
2. Products → Create product (DRAFT) with optional price/stock  
3. Edit: set price (Offer), media URL/object key, SEO  
4. Click **Publish** (validates SKU + Offer)  
5. Verify on storefront `/products` and search  
6. Ask AI assistant to find the product by name/budget

## CSV import

1. Products → Imports  
2. Dry-run validate  
3. Commit import  
4. Confirm worker processed `catalog.import`  
5. Publish desired DRAFT products

## Disable marketplace sync (already default)

Product sources `mock-marketplace` / `csv-fixture-feed` / `jumia-seller-api` are **disabled / deferred**. Do not enable for customer catalog.

## Escrow

Not implemented. Requires provider docs + credentials later.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Draft not on storefront | Status must be ACTIVE |
| Publish fails | Missing Offer / SKU |
| Import stuck PENDING | Worker running + migrate applied |
| AI invents products | Confirm tools return empty; prompt forbids fabrication |
