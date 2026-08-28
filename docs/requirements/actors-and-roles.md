# Actors and roles

**Aligns with:** ADR-0008, SRS §11

## Actors

| Actor                 | Description                                          |
| --------------------- | ---------------------------------------------------- |
| Guest                 | Unauthenticated shopper with guest cart              |
| Customer              | Authenticated shopper                                |
| Staff                 | Operational user (support, catalog, inventory, etc.) |
| Admin                 | Privileged staff with broader permissions            |
| Super-admin           | Highest privilege; heavily audited                   |
| Payment provider      | External (e.g. M-Pesa) via webhooks                  |
| Courier provider      | External delivery signals                            |
| Notification provider | Email/SMS/WhatsApp                                   |
| AI service            | Internal service identity invoking tools             |
| Worker                | Internal job consumer                                |
| System                | Automated jobs (expiry, reconcile)                   |

## Roles (conceptual RBAC)

CUSTOMER, SUPPORT, CATALOG_MANAGER, INVENTORY_MANAGER, ORDER_MANAGER,
FINANCE, MARKETING, ANALYST, ADMIN, SUPER_ADMIN (ADR-0008).

### Launch roles (implemented)

For v1 launch the identity seed provisions only:

| Role          | Purpose                                          |
| ------------- | ------------------------------------------------ |
| `CUSTOMER`    | Storefront shoppers                              |
| `ADMIN`       | Day-to-day catalog, orders, inventory, customers |
| `SUPER_ADMIN` | Full permission catalog including system manage  |

Granular staff roles (`SUPPORT`, `CATALOG_MANAGER`, etc.) remain **conceptual**
in ADR-0008 and can be added post-launch without schema changes. Do not assume
they exist in the database until explicitly seeded.

Permissions are `resource:action` (e.g. `orders:refund`, `catalog:update`).
Roles alone are insufficient for ownership checks (own order only).
