# ADR-0014: Notifications and omnichannel communication architecture

- Status: **Accepted**
- Date: 2026-08-13
- Deciders: Platform Architecture; accepted by architecture program review on
  2026-08-13
- Aligns with: [docs/ARCHITECTURE.md](../ARCHITECTURE.md),
  ADR-0005–ADR-0013 (**Accepted**)
- Scope: Transactional, operational, and marketing notification architecture;
  channels; templates; consent; async delivery; provider adapters
- Out of scope: Implementing providers; buying WhatsApp/SMS accounts;
  creating schemas; modifying apps

## 1. Context

Commerce events (ADR-0011/0013) and identity (ADR-0008) need reliable
customer/ops messaging without blocking checkout, payments, or fulfillment.
ADR-0006 provides BullMQ; ADR-0009 requires async side effects.

## 2. Problem

Without a notification ADR, teams embed Twilio/WhatsApp SDKs in order code,
block payments on SMS, mix marketing with receipts, and lose delivery audit.

## 3. Goals / Non-goals

**Goals:** channel-agnostic notification domain; async-only delivery; clear
transactional vs marketing split; Kenya-first channels (SMS/WhatsApp/email);
consent/opt-out; idempotent jobs; PG audit of attempts.

**Non-goals:** building a full CDP/ESP; implementing marketing automation UI;
hardcoding a single vendor.

## 4. Decision

Adopt a **Notification** bounded context:

```text
Domain event → NotificationPolicy → NotificationIntent (PG)
  → outbox/BullMQ → worker → NotificationProvider adapter → provider
  → delivery result persisted
```

Critical commerce transactions **never wait** on provider HTTP.

## 5. Communication classes

| Class | Examples | Required for checkout? | Consent |
| --- | --- | --- | --- |
| **Transactional** | Order/payment confirmation, OTP, shipping updates, refunds | Yes (attempted) | Account/service necessity |
| **Operational** | Admin alerts, fraud flags (future) | N/A | Staff accounts |
| **Marketing** | Promos, abandoned cart campaigns | **Never** | Explicit opt-in |

Marketing must **never** be treated as mandatory transactional mail.

## 6. Channels (v1 vs future)

| Channel | v1 | Notes |
| --- | --- | --- |
| Email | **Yes** | Primary receipts |
| SMS | **Yes** (Kenya) | OTP + critical alerts |
| WhatsApp | **Ready** via adapter; enable when Business API ready | Omnichannel |
| Push | Future (mobile) | — |
| In-app | Future | Store notification rows |

## 7. Architecture

### Entities (conceptual)

`NotificationIntent`, `NotificationDelivery`, `NotificationTemplate`,
`CustomerCommunicationPreference`, `ConsentRecord`.

### Ports

`NotificationDispatcher`, `EmailProvider`, `SmsProvider`,
`WhatsAppProvider`, `PushProvider`.

Provider SDK types stay in adapters (ADR-0009).

### Templates

- Versioned templates in PG (or object storage + PG metadata)
- Locale support (English v1; expandable)
- Variables validated; **no raw HTML injection from untrusted input**
- Template version snapshotted on send for audit

### Preferences & consent

- Per-channel transactional vs marketing flags
- Unsubscribe / opt-out for marketing; store ConsentRecord
- OTP/transactional may still send when legally/operationally required —
  **legal review** before production copy; architecture supports suppression
  lists where mandated

## 8. Idempotency & retries

- Intent key: `(eventType, aggregateId, channel, templateKey)` unique where
  appropriate
- BullMQ retries with backoff; DLQ after max attempts
- Provider message ids stored; duplicate webhooks idempotent

## 9. Rate limits & abuse

Redis rate limits on OTP/SMS; per-customer and global caps (ADR-0008/0009).
Fail closed on OTP abuse paths.

## 10. Data ownership

| Store | Role |
| --- | --- |
| PostgreSQL | Intents, deliveries, templates, preferences, consent |
| Redis | Rate limits, ephemeral queues |
| BullMQ | Transport |
| Object storage | Large template assets / attachments if any |
| Providers | External delivery state |

## 11. Security / PII

- Minimize PII in templates/logs; redact phone/email in non-secure sinks
- Never log OTP codes, payment secrets, or auth tokens
- Admin access to notification logs via RBAC

## 12. Failure recovery

Provider outage → intent remains `PENDING`/`FAILED`; commerce continues;
retry/reconcile. Redis down → use outbox; rate-limit degrade per ADR-0006.

## 13. Observability

Delivery success/fail by channel, latency, DLQ depth, OTP send rate,
unsubscribe rate. Correlation ids on intents.

## 14. AI boundary

AI may trigger **allowed** transactional notifications only through domain
APIs with AuthZ — never spam marketing or invent messages outside templates.

## 15. Alternatives rejected

Sync SMS in payment tx; provider SDKs in Order module; marketing = required
transactional; Redis as sole delivery log.

## 16. Dependencies

ADR-0005 Nest modules; ADR-0006 BullMQ/PG/Redis; ADR-0008 identity/consent
hooks; ADR-0009 events/webhooks; ADR-0011/0013 event producers.

## 17. Future

Campaign orchestration, preference center UI, push, rich WhatsApp commerce
templates, deliverability analytics.

## 18. Decision status

**Accepted.** Indexed in [DECISIONS.md](../DECISIONS.md).
