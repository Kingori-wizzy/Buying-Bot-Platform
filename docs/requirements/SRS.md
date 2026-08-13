# Buying Bot Platform — System Requirements Specification (SRS)

| Field       | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Document ID | BBP-SRS-001                                                                  |
| Version     | 1.0.0                                                                        |
| Status      | Baseline (architecture-aligned)                                              |
| Date        | 2026-08-13                                                                   |
| Precedence  | Accepted ADRs > this SRS for architecture; SRS defines testable requirements |

## Document control

| Version | Date       | Author               | Notes                               |
| ------- | ---------- | -------------------- | ----------------------------------- |
| 1.0.0   | 2026-08-13 | Architecture program | Initial baseline from ADR-0005–0020 |

## 1. Purpose

Specify testable system requirements for the Buying Bot Platform so engineering,
QA, security, and product teams can implement and verify the system without
re-deciding architecture.

## 2. Scope

**In scope:** Kenya-first AI-assisted omnichannel commerce: identity, catalog,
inventory, pricing, cart, checkout, payments (M-Pesa first), fulfillment,
returns, notifications, AI assistant (tools + RAG), admin operations,
observability, security, and deployability of the modular monolith monorepo.

**Out of scope (v1 product):** Full marketplace multi-seller settlements,
Kubernetes-from-day-one, dedicated search cluster, card PAN storage, autonomous
unrestricted AI agents, legal compliance certification claims.

## 3. Product vision

An AI-powered buying platform where customers discover and purchase products
safely, administrators operate catalog/inventory/orders securely, and AI
assists discovery **without** becoming the authority for price, stock, or money.

## 4. Business objectives

- Launch commerce with authoritative server-side pricing and inventory.
- Support M-Pesa-first payments with verified confirmation.
- Provide admin RBAC with stronger security than customers.
- Enable AI shopping assistance via authorized tools.
- Keep PostgreSQL as system of record; degrade gracefully when derived systems fail.

## 5. Problem statement

Without a requirements baseline, implementation will diverge from accepted ADRs
(float money, client totals, AI inventing prices, Redis as ledger). This SRS
locks testable SHALL requirements aligned to ADRs.

## 6. Target users

Customers (shoppers), staff (ops roles), administrators, super-admins, and
internal service identities (api/worker/ai-service).

## 7. System boundaries

| Inside                                                     | Outside                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/web`, `admin`, `api`, `worker`, `ai-service`, `docs` | Payment rails (M-Pesa), SMS/email/WA, couriers, LLM vendors |
| `packages/*` contracts                                     | Customer devices, CDN edges                                 |
| PostgreSQL, Redis, BullMQ, object storage (platform-owned) | Provider-side ledgers until reconciled                      |

## 8. Definitions

See [requirements-glossary.md](./requirements-glossary.md). Key: Offer, SKU,
Reservation, FinancialCalculationResult, PaymentAttempt, Shipment, Tool.

## 9. References (authoritative ADRs)

ADR-0005–0020 (Accepted), [DECISIONS.md](../DECISIONS.md),
[ARCHITECTURE.md](../ARCHITECTURE.md),
[ARCHITECTURE_DECISION_MATRIX.md](../ARCHITECTURE_DECISION_MATRIX.md),
[PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md),
[Deployment/disaster-recovery.md](../Deployment/disaster-recovery.md).

## 10. Assumptions / Constraints / Dependencies

See [requirements-assumptions-and-constraints.md](./requirements-assumptions-and-constraints.md).

**Assumptions:** Single merchant at launch; KES primary currency; English UI v1.  
**Constraints:** No floating-point money; no client-authoritative totals; AI no
direct DB; containers before K8s.  
**Dependencies:** Nest+Fastify, Next.js, PostgreSQL, Redis, BullMQ, object storage.

## 11. Actors and roles

See [actors-and-roles.md](./actors-and-roles.md).

## 12. Functional requirements (summary index)

Full statements live in sections below and related domain files. Counts are
enumerated in the final audit.

### 12.1 Identity & access

| ID          | Requirement                                                                                                                                     | ADR       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| FR-AUTH-001 | The system SHALL support customer registration with email verification.                                                                         | 0008      |
| FR-AUTH-002 | The system SHALL authenticate customers via password (launch) with HttpOnly Secure session cookies for web.                                     | 0008      |
| FR-AUTH-003 | The system SHALL support password reset with single-use time-limited tokens.                                                                    | 0008      |
| FR-AUTH-004 | The system SHOULD support phone OTP as complementary auth for Kenya.                                                                            | 0008      |
| FR-AUTH-005 | Admin/staff SHALL use a separate security realm (cookies/sessions) from customers.                                                              | 0008      |
| FR-AUTH-006 | Privileged admin access SHALL require MFA (TOTP minimum).                                                                                       | 0008      |
| FR-AUTH-007 | The API SHALL enforce RBAC permissions server-side; UI hiding SHALL NOT be sufficient.                                                          | 0008,0005 |
| FR-AUTH-008 | Service-to-service calls SHALL use short-lived signed service JWTs (not human credentials).                                                     | 0008,0009 |
| FR-AUTH-009 | Account states SHALL include at least PENDING_VERIFICATION, ACTIVE, SUSPENDED, LOCKED, DEACTIVATED, DELETED, COMPROMISED semantics as designed. | 0008      |
| FR-AUTH-010 | Auth endpoints SHALL be rate-limited; fail closed on abuse paths when Redis unavailable.                                                        | 0008,0006 |

### 12.2 Catalog & search

| ID         | Requirement                                                                                                    | ADR       |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------- |
| FR-CAT-001 | Catalog SHALL model Product → Variant → SKU → Offer.                                                           | 0010      |
| FR-CAT-002 | Offer SHALL be the commercial boundary for price/currency even for single merchant.                            | 0010      |
| FR-CAT-003 | Public catalog SHALL expose only ACTIVE products (and sellable offers per policy).                             | 0010      |
| FR-CAT-004 | Product lifecycle SHALL use DRAFT, PENDING_REVIEW, ACTIVE, INACTIVE, ARCHIVED — not OUT_OF_STOCK as lifecycle. | 0010      |
| FR-CAT-005 | Inventory availability SHALL be derived (AVAILABLE/LOW_STOCK/OUT_OF_STOCK) separately from lifecycle.          | 0010      |
| FR-CAT-006 | Media bytes SHALL live in object storage; PostgreSQL SHALL store metadata only.                                | 0010,0006 |
| FR-CAT-007 | Images SHALL NOT be a universal hard requirement for ACTIVE; validation MAY be policy-configurable.            | 0010      |
| FR-CAT-008 | Search SHALL use PostgreSQL FTS + pg_trgm (+ pgvector where used) as stage-1; search index is derived.         | 0010,0006 |
| FR-CAT-009 | Filters/sorts SHALL be allow-listed; unknown filters SHALL be rejected.                                        | 0009,0010 |
| FR-CAT-010 | AI catalog access SHALL use authorized tools only; AI SHALL NOT query PostgreSQL directly.                     | 0010,0015 |

### 12.3 Inventory

| ID         | Requirement                                                                                                                    | ADR       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| FR-INV-001 | On-hand and reserved quantities SHALL live in PostgreSQL, not Redis.                                                           | 0010,0006 |
| FR-INV-002 | Stock changes SHALL use append-only inventory movements.                                                                       | 0010      |
| FR-INV-003 | Checkout SHALL create reservations; add-to-cart SHALL NOT reserve.                                                             | 0011,0010 |
| FR-INV-004 | Payment confirmation SHALL convert reservation to committed sale movement.                                                     | 0011      |
| FR-INV-005 | Reservation expiry SHALL release stock; late payment SHALL enter reconciliation hold — SHALL NOT blindly oversell.             | 0011      |
| FR-INV-006 | Restock after return SHALL require explicit movements; inspection-required returns SHALL NOT silent-restock before inspection. | 0013      |

### 12.4 Pricing / promotions / tax

| ID           | Requirement                                                                                                             | ADR       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | --------- |
| FR-PRICE-001 | Money SHALL use integer minor units + ISO 4217; no floating-point financial arithmetic.                                 | 0012      |
| FR-PRICE-002 | Launch currency context SHALL be KES; currency SHALL NOT be hardcoded into schemas.                                     | 0012      |
| FR-PRICE-003 | One settlement currency per order SHALL be enforced.                                                                    | 0011,0012 |
| FR-PRICE-004 | Client-supplied prices/discounts/tax/totals SHALL be ignored for payable amounts.                                       | 0011,0012 |
| FR-PRICE-005 | Checkout SHALL re-resolve Offer price; v1 SHALL NOT soft-lock cart prices.                                              | 0012      |
| FR-PRICE-006 | If displayed cart price differs from checkout price, customer SHALL be informed before payment.                         | 0012      |
| FR-PRICE-007 | Promotion stacking SHALL be deterministic: item promo → coupon → cart promo; unlimited stacking SHALL NOT be supported. | 0012      |
| FR-PRICE-008 | At most one coupon per checkout SHALL apply.                                                                            | 0012      |
| FR-PRICE-009 | Coupon usage limits SHALL be enforced transactionally in PostgreSQL.                                                    | 0012      |
| FR-PRICE-010 | Rounding SHALL use half-away-from-zero on minor units.                                                                  | 0012      |
| FR-PRICE-011 | Tax SHALL use TaxCalculator port + configuration; statutory rates SHALL NOT be hardcoded.                               | 0012      |
| FR-PRICE-012 | If required tax cannot be determined, checkout SHALL fail closed.                                                       | 0012      |
| FR-PRICE-013 | Order financial snapshots SHALL be immutable; refunds SHALL use snapshots not live reprice.                             | 0011,0012 |

### 12.5 Cart / checkout / orders / payments

| ID          | Requirement                                                                                                    | ADR       |
| ----------- | -------------------------------------------------------------------------------------------------------------- | --------- |
| FR-CART-001 | Cart state SHALL be authoritative in PostgreSQL; browser holds HttpOnly cart id only.                          | 0011      |
| FR-CART-002 | Guest carts SHALL be supported with takeover protections.                                                      | 0011      |
| FR-CHK-001  | Checkout SHALL be server-authoritative and idempotent via Idempotency-Key + PG.                                | 0011,0009 |
| FR-ORD-001  | Order SHALL be created at checkout commit as PENDING_PAYMENT before payment confirmation.                      | 0011      |
| FR-ORD-002  | Order items SHALL store immutable snapshots (name, SKU, offer, prices, tax, etc.).                             | 0011      |
| FR-ORD-003  | Order, payment, fulfillment, reservation statuses SHALL remain separate fields.                                | 0011,0013 |
| FR-PAY-001  | Payment initiation SHALL NOT mark order PAID.                                                                  | 0011      |
| FR-PAY-002  | Authoritative confirmation SHALL be verified webhook and/or provider query — never frontend thank-you.         | 0011      |
| FR-PAY-003  | Payment providers SHALL implement PaymentProvider port; M-Pesa first adapter; SDKs SHALL NOT leak into domain. | 0011,0016 |
| FR-PAY-004  | Partial capture of payable SHALL be rejected in v1.                                                            | 0011      |
| FR-PAY-005  | Payment-critical side effects SHALL use transactional outbox once payments go live.                            | 0011      |
| FR-PAY-006  | Refunds SHALL distinguish REFUND_REQUESTED vs REFUND_CONFIRMED and be idempotent.                              | 0011      |
| FR-WH-001   | Webhooks SHALL verify signature, validate timestamp/replay, persist, ack fast, process async.                  | 0009,0008 |

### 12.6 Fulfillment / returns

| ID         | Requirement                                                                                              | ADR  |
| ---------- | -------------------------------------------------------------------------------------------------------- | ---- |
| FR-FUL-001 | System SHALL NOT fulfill unpaid orders.                                                                  | 0013 |
| FR-FUL-002 | v1 SHALL use one default fulfillment location with locationId abstraction.                               | 0013 |
| FR-FUL-003 | v1 SHALL support one shipment per order; schema SHALL allow future multi-shipment.                       | 0013 |
| FR-FUL-004 | Delivery address on order SHALL be an immutable snapshot.                                                | 0013 |
| FR-FUL-005 | Delivery failure SHALL NOT automatically imply refund.                                                   | 0013 |
| FR-RET-001 | Returns SHALL follow configurable eligibility and default inspection before restock.                     | 0013 |
| FR-RET-002 | Customers MAY cancel after PAID before fulfillment dispatch; after dispatch SHALL use return/RTS policy. | 0013 |

### 12.7 Notifications

| ID         | Requirement                                                                  | ADR       |
| ---------- | ---------------------------------------------------------------------------- | --------- |
| FR-NOT-001 | Commerce transactions SHALL NOT block on notification provider HTTP.         | 0014      |
| FR-NOT-002 | Marketing messages SHALL NOT be treated as mandatory transactional messages. | 0014      |
| FR-NOT-003 | Notification providers SHALL be adapters behind ports.                       | 0014,0016 |

### 12.8 AI

| ID        | Requirement                                                                                             | ADR            |
| --------- | ------------------------------------------------------------------------------------------------------- | -------------- |
| FR-AI-001 | AI service SHALL NOT connect directly to PostgreSQL or Redis.                                           | 0015           |
| FR-AI-002 | AI SHALL NOT invent prices, stock, discounts, taxes, or order/payment/shipment status.                  | 0015           |
| FR-AI-003 | AI actions SHALL use authorized tools re-checked by API/domain AuthZ.                                   | 0015,0008      |
| FR-AI-004 | RAG SHALL be informational with provenance; SHALL NOT be transactional SoT.                             | 0015           |
| FR-AI-005 | High-risk tools (payment/admin) SHALL require elevated permission and human-approval flags as designed. | 0015           |
| FR-AI-006 | AI streaming SHOULD use SSE from the API edge.                                                          | 0007,0009,0015 |

### 12.9 Platform / API

| ID         | Requirement                                                          | ADR       |
| ---------- | -------------------------------------------------------------------- | --------- |
| FR-API-001 | Public API SHALL be versioned REST under `/v1`.                      | 0009      |
| FR-API-002 | OpenAPI SHALL be the authoritative external API description.         | 0009      |
| FR-API-003 | Requests SHALL be validated with Zod from shared validation package. | 0005,0009 |
| FR-API-004 | Errors SHALL use ApiErrorBody shape with code, message, requestId.   | 0009      |
| FR-API-005 | Correlation/request IDs SHALL propagate across API, worker, AI.      | 0009,0017 |

## 13. Non-functional requirements

See [non-functional-requirements.md](./non-functional-requirements.md).

## 14. Business rules

See [business-rules.md](./business-rules.md).

## 15. Security / AI / integration / data / audit

Covered by FR-* above and NFR-SEC-_, NFR-AI-_, design docs. Payment data: no
PAN/CVV/PIN storage (NFR-SEC / ADR-0008/0011/0018).

## 16. Performance / availability / DR

Aspirational targets from ADR-0009/0012/0017/0019; foundation RPO ≤24h,
RTO ≤4h until tightened and drill-proven ([disaster-recovery.md](../Deployment/disaster-recovery.md)).

## 17. Accessibility / SEO

Web SHALL target WCAG 2.2 AA for core journeys (ADR-0007). Public catalog
pages SHALL support SEO metadata from catalog data.

## 18. Compliance

Technical controls are specified; **legal compliance is NOT claimed**
(ADR-0018). OPEN: counsel review for Kenya DPA / tax invoicing.

## 19. Acceptance criteria (documentation baseline)

- Requirements have unique IDs and are testable.
- Traceability exists in RTM.
- No requirement contradicts Accepted ADRs.

## 20. Future capabilities

Marketplace settlements, dedicated search, K8s, cards, pickup networks,
fraud engine — future ADRs/milestones.

## 21. Related documents

[use-cases.md](./use-cases.md), [RTM.md](./RTM.md), [../design/SDS.md](../design/SDS.md).
