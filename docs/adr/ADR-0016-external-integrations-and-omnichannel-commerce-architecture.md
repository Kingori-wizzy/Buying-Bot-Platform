# ADR-0016: External integrations and omnichannel commerce architecture

- Status: **Accepted**
- Date: 2026-08-13
- Deciders: Platform Architecture; accepted by architecture program review on
  2026-08-13
- Aligns with: ADR-0005–ADR-0015 (**Accepted**)
- Scope: Provider integration pattern, credentials, webhooks, polling,
  reconciliation, omnichannel ingress readiness
- Out of scope: Implementing providers; social commerce storefronts; schemas

## 1. Context / Problem

Payments (M-Pesa), notifications, couriers, AI, object storage, and future
WhatsApp/Instagram/TikTok commerce must integrate without leaking SDKs into
domain or creating duplicate SoTs.

## 2. Goals / Non-goals

**Goals:** Port → Adapter → Provider everywhere; verified webhooks;
idempotent inbound events; reconciliation; add providers without domain
rewrite; Kenya-first payments/messaging.

**Non-goals:** Building a universal iPaaS; locking one courier/LLM forever;
full social checkout in v1.

## 3. Decision

All external systems integrate via **ports in application/domain** and
**adapters in infrastructure** (Nest modules / worker).

```text
Domain/Application → Port interface
                        → Adapter (maps canonical ↔ provider)
                            → Provider SDK / HTTP
```

Canonical internal models (Order, Payment, Shipment, NotificationIntent,
ChannelIdentity) are platform-owned. Provider payloads are normalized on
ingress.

## 4. Integration catalog (v1 readiness)

| Integration               | Port                              | v1                  |
| ------------------------- | --------------------------------- | ------------------- |
| M-Pesa / payments         | PaymentProvider (ADR-0011)        | Primary             |
| Future cards              | PaymentProvider                   | Later               |
| Email/SMS/WhatsApp        | Notification providers (ADR-0014) | Email+SMS; WA ready |
| Couriers                  | DeliveryProvider (ADR-0013)       | Adapter-ready       |
| LLM/embeddings            | ModelProvider (ADR-0015)          | Required for AI     |
| Object storage            | ObjectStorage port (ADR-0006)     | Required            |
| Catalog import            | Import pipeline (ADR-0010)        | Async               |
| Analytics                 | Outbound events (future)          | Optional            |
| Search SaaS               | Deferred (ADR-0010 PG FTS)        | Later ADR           |
| Instagram/TikTok commerce | Channel adapters                  | Future omnichannel  |

## 5. Credentials & secrets

- Stored in secret manager / env (ADR-0019); **never** in git
- Per-provider encrypted refs in PG for multi-account later
- Rotation supported; adapters read via config ports

## 6. Inbound events

Webhooks: verify HMAC → timestamp/replay → persist → ack → async
(ADR-0008/0009). Polling allowed for providers without reliable webhooks
(reconcile jobs).

Idempotency: provider event id unique in PostgreSQL.

## 7. Outbound calls

Timeouts, bounded retries with jitter, circuit breakers for sustained
failure (ADR-0009). No provider HTTP inside long DB transactions.

## 8. Reconciliation

Scheduled jobs compare platform vs provider for payments, deliveries, and
critical notifications. Divergences → ops hold / replay — never silent
overwrite of money/stock.

## 9. Omnichannel identity

Channel identities link to User/Customer per ADR-0008 (WhatsApp MSISDN,
etc.). Unverified merges forbidden.

## 10. Data ownership

PG = integration receipts, sync cursors, canonical state. Providers =
external truth for _their_ rails until reconciled. Redis = rate limits only.

## 11. Security

No trust of source IP alone; signature required. SSRF protections on
outbound URLs. Least-privilege credentials.

## 12. Failure recovery

Provider outage → degrade feature (pay retry, ship delay, AI off); core
catalog/order read from PG continues. Duplicate events idempotent.

## 13. Alternatives rejected

Domain imports Daraja/Stripe/WhatsApp types; Zapier as SoT; sync-only
integrations without idempotency.

## 14. Future

Social checkout, marketplace connectors, EDI suppliers, advanced iPaaS —
new ADRs if trust boundaries change.

## 15. Decision status

**Accepted.** Indexed in [DECISIONS.md](../DECISIONS.md).
