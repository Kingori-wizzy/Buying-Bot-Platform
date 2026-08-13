# Business rules

**Keywords:** SHALL. Each rule maps to ADRs and tests.

| ID | Rule | ADR |
| --- | --- | --- |
| BR-PRICE-001 | Payable amounts SHALL be calculated server-side from Offer + pipeline. | 0012 |
| BR-PRICE-002 | Effective unit price SHALL resolve list vs sale windows by priority → lowest price → stable id. | 0012 |
| BR-PRICE-003 | Discounts SHALL apply item promo → coupon → cart promo; stack only if explicitly permitted. | 0012 |
| BR-PRICE-004 | At most one coupon per checkout. | 0012 |
| BR-PRICE-005 | Rounding SHALL be half-away-from-zero on minor units. | 0012 |
| BR-PRICE-006 | Tax failure SHALL fail closed (no checkout). | 0012 |
| BR-PRICE-007 | No FX / multi-currency lines in one order. | 0012 |
| BR-PRICE-008 | No cart price soft-lock in v1; checkout re-resolves Offer. | 0012 |
| BR-INV-001 | Add-to-cart SHALL NOT reserve stock. | 0011 |
| BR-INV-002 | Reservation at checkout; expiry releases; late pay → reconciliation hold. | 0011 |
| BR-INV-003 | All stock changes SHALL be movements. | 0010 |
| BR-ORD-001 | Order created PENDING_PAYMENT at checkout commit. | 0011 |
| BR-ORD-002 | Order items and financial totals are immutable snapshots. | 0011 |
| BR-ORD-003 | Order/payment/fulfillment/reservation statuses are separate. | 0011/0013 |
| BR-PAY-001 | Initiation ≠ confirmation. | 0011 |
| BR-PAY-002 | Frontend success page is not payment authority. | 0011 |
| BR-PAY-003 | Partial payable capture rejected in v1. | 0011 |
| BR-PAY-004 | Refunds: REQUESTED ≠ CONFIRMED; idempotent. | 0011 |
| BR-FUL-001 | Never fulfill unpaid orders. | 0013 |
| BR-FUL-002 | Delivery failure does not auto-refund. | 0013 |
| BR-FUL-003 | Address snapshot immutable after commit (no silent rewrite). | 0013 |
| BR-RET-001 | Physical returns inspect before restock by default. | 0013 |
| BR-RET-002 | Shipping fee default non-refundable unless policy says otherwise. | 0013 |
| BR-AUTH-001 | Backend AuthZ is authoritative. | 0008 |
| BR-AUTH-002 | Customer and admin realms are separate. | 0008 |
| BR-AUTH-003 | Admin MFA mandatory for privileged access. | 0008 |
| BR-AI-001 | AI shall not invent money/stock/status; tools only. | 0015 |
| BR-AI-002 | High-risk tools require AuthZ + approval flags. | 0015 |
| BR-API-001 | Idempotent financial ops use PostgreSQL keys. | 0009/0011 |
| BR-API-002 | Webhooks: verify → persist → ack → async. | 0009 |
| BR-NOT-001 | Marketing is never mandatory transactional. | 0014 |
| BR-CAT-001 | OUT_OF_STOCK is availability, not product lifecycle. | 0010 |
| BR-CAT-002 | Offer is commercial boundary at v1. | 0010 |
