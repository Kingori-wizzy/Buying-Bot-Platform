# Requirements glossary

| Term | Definition |
| --- | --- |
| Offer | Seller-specific commercial terms for a SKU (price, currency) — ADR-0010 |
| SKU | Stock-keeping identity of a variant |
| Reservation | Temporary inventory hold at checkout — ADR-0010/0011 |
| Financial snapshot | Immutable calculation result stored on order — ADR-0011/0012 |
| PaymentAttempt | One provider try; initiated ≠ confirmed — ADR-0011 |
| Outbox | PG transactional outbox for payment-critical side effects |
| Fulfillment | Ops unit for pick/pack/dispatch — ADR-0013 |
| Shipment | Physical parcel + tracking — ADR-0013 |
| Tool | Authorized AI capability invoking domain APIs — ADR-0015 |
| RAG | Retrieval-augmented generation over knowledge corpora — not SoT |
| Idempotency-Key | Client key for safe retries — ADR-0009 |
| Realm | Separate auth security context (customer vs admin) — ADR-0008 |
| SoT | System of record (PostgreSQL for commerce) |

Keywords: **SHALL** mandatory, **SHOULD** recommended, **MAY** optional.
