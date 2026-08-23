# Admin Product Management

## Capabilities

| Action | Endpoint / UI |
|--------|----------------|
| List all statuses | `GET /v1/admin/catalog/products` · Admin → Products |
| Create | `POST /v1/admin/catalog/products` · `/catalog/new` |
| Edit | `PATCH /v1/admin/catalog/products/:id` · `/catalog/[id]` |
| Publish | `POST /v1/admin/catalog/products/:id/publish` |
| Price | `POST/PATCH /v1/admin/catalog/offers` |
| Media | `POST /v1/admin/catalog/media` |
| Inventory | `POST /v1/admin/inventory/adjust` |
| CSV import | `POST /v1/admin/catalog/imports` · `/catalog/imports` |

## Lifecycle

`DRAFT → PENDING_REVIEW → ACTIVE → INACTIVE → ARCHIVED`

Publishing to **ACTIVE** requires:

- product name
- SKU
- active Offer with non-negative price

Invalid products cannot be published accidentally.

## Security

- Admin realm + MFA
- RBAC: `catalog:create|update|read`, `inventory:update`
- CSRF on mutations
- Upload MIME allowlist for media metadata
- Audit via existing security events where wired

## Pricing truth

- Display price = Offer from API  
- Payable price = pricing engine at checkout  
- Never trust browser/AI totals
