# Product Import Guide

## CSV format

Required header column: `name`

Optional columns:

`slug`, `shortDescription`, `description`, `brand`, `category`, `internalSku`, `listPriceMinor`, `currency`, `initialStock`, `status`

Example:

```csv
name,slug,brand,category,internalSku,listPriceMinor,currency,initialStock,status
Demo TV 55,demo-tv-55,Acme,televisions,SKU-DEMO-TV,6499900,KES,10,DRAFT
```

## Flow

1. Paste CSV in Admin → Imports  
2. **Dry run** first (validate only)  
3. Uncheck dry run to **commit**  
4. Worker processes `catalog.import` outbox job  
5. Review import history (created / updated / rejected)

## Rules

- Invalid rows are rejected with reasons  
- Duplicate `internalSku` updates the existing product (status forced to DRAFT until republished)  
- Imported products use `contentOrigin: IMPORT`  
- ACTIVE status in CSV is not auto-published; rows are created as DRAFT for safety
