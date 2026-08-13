# Actors and roles

**Aligns with:** ADR-0008, SRS §11

## Actors

| Actor | Description |
| --- | --- |
| Guest | Unauthenticated shopper with guest cart |
| Customer | Authenticated shopper |
| Staff | Operational user (support, catalog, inventory, etc.) |
| Admin | Privileged staff with broader permissions |
| Super-admin | Highest privilege; heavily audited |
| Payment provider | External (e.g. M-Pesa) via webhooks |
| Courier provider | External delivery signals |
| Notification provider | Email/SMS/WhatsApp |
| AI service | Internal service identity invoking tools |
| Worker | Internal job consumer |
| System | Automated jobs (expiry, reconcile) |

## Roles (conceptual RBAC)

CUSTOMER, SUPPORT, CATALOG_MANAGER, INVENTORY_MANAGER, ORDER_MANAGER,
FINANCE, MARKETING, ANALYST, ADMIN, SUPER_ADMIN (ADR-0008).

Permissions are `resource:action` (e.g. `orders:refund`, `catalog:update`).
Roles alone are insufficient for ownership checks (own order only).
