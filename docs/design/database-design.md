# Database design (conceptual)

**Status:** Conceptual model only — **no migrations in this task**  
**Aligns with:** ADR-0006, 0008, 0010–0015

## Schemas (illustrative)

identity, customers, catalog, inventory, cart, orders, payments, promotions,
notifications, conversations, ai, integrations, analytics, audit.

## Entity catalog

### Identity
| Entity | Purpose | Keys / notes |
| --- | --- | --- |
| User | Subject | UUID PK |
| Organization | Tenant/merchant | UUID; v1 single default |
| Membership | User↔Org + roles | unique (user, org) |
| Role / Permission / RolePermission | RBAC | |
| Credential | Password hash etc. | Argon2id |
| Session | Server session | hashed token; realm |
| MfaFactor | TOTP/WebAuthn | |
| OAuthAccount / ChannelIdentity | Links | |
| SecurityEvent | Auth audit | append-only |

### Catalog
Product, Category, Brand, Variant, Sku, Offer, AttributeDefinition,
ProductAttributeValue, MediaAsset (object key), PriceWindow.

Lifecycle on Product; price on Offer; uniqueness internalSku.

### Inventory
Location, InventoryBalance (sku, location, on_hand, reserved, version),
InventoryMovement (append-only), Reservation (order/cart, expiry, status).

### Commerce
Cart, CartLine (offerId, skuId, qty), Order, OrderItem (snapshots),
Payment, PaymentAttempt, PaymentTransaction, RefundRecord,
OrderFinancialSnapshot / embedded calculation JSON.

### Pricing
Promotion, Coupon (normalized code or hash), CouponRedemption,
TaxPolicy/TaxRate config, CalculationVersion metadata on orders.

### Fulfillment
Fulfillment, FulfillmentLine, Shipment, ShipmentEvent, ReturnRequest,
ReturnLine, ProofOfDelivery (object refs).

### Integration / async
IdempotencyRecord, WebhookReceipt, OutboxMessage, ExternalReference.

### AI
Conversation, Message, KnowledgeDocument, Chunk, Embedding (pgvector),
ToolExecution, AiAuditEvent.

### Audit
AuditEvent (actor, action, entity, before/after refs, correlationId).

## Constraints & indexes (design intent)

- Unique idempotency (actor, key); unique provider event ids
- Check on_hand >= reserved
- Indexes: slug, FTS tsvector, reservation expiry, orderNumber
- Soft-delete/archive for catalog referenced by orders

## Consistency

Strong: inventory, payments, orders, redemptions. Eventual: search,
embeddings, notifications.
