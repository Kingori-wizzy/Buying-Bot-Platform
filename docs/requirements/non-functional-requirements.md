# Non-functional requirements

Aspirational targets are labeled **ASPIRATIONAL** (unverified). Foundation DR
from existing docs.

## Security

| ID          | Requirement                                                           | ADR            |
| ----------- | --------------------------------------------------------------------- | -------------- |
| NFR-SEC-001 | The system SHALL NOT store PAN, CVV, or PIN.                          | 0008/0011/0018 |
| NFR-SEC-002 | Passwords SHALL be hashed with modern algorithm (Argon2id preferred). | 0008           |
| NFR-SEC-003 | Production CORS SHALL NOT use wildcard with credentials.              | 0008/config    |
| NFR-SEC-004 | Secrets SHALL NOT be committed to git.                                | 0018/0019      |
| NFR-SEC-005 | Logs SHALL redact tokens, passwords, OTP, payment secrets.            | 0017/0018      |
| NFR-SEC-006 | CSRF protections SHALL apply to cookie-authenticated mutations.       | 0008           |
| NFR-SEC-007 | Webhooks SHALL require signature verification.                        | 0008/0009      |

## Performance (ASPIRATIONAL)

| ID           | Requirement                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| NFR-PERF-001 | API standard reads SHOULD target p95 &lt; 300 ms (ASPIRATIONAL).                      |
| NFR-PERF-002 | Search SHOULD target p95 &lt; 500 ms (ASPIRATIONAL).                                  |
| NFR-PERF-003 | Checkout commit SHOULD target p95 &lt; 800 ms (ASPIRATIONAL).                         |
| NFR-PERF-004 | Webhook acknowledgement SHOULD target &lt; 1 s (ASPIRATIONAL).                        |
| NFR-PERF-005 | AI first-token SHOULD target &lt; 2 s (ASPIRATIONAL).                                 |
| NFR-PERF-006 | Financial calculation for typical carts SHOULD target p95 &lt; 100 ms (ASPIRATIONAL). |

## Availability / reliability

| ID            | Requirement                                                        |
| ------------- | ------------------------------------------------------------------ |
| NFR-AVAIL-001 | API SHOULD expose liveness and readiness endpoints.                |
| NFR-AVAIL-002 | When search is down, get-by-id and checkout SHALL remain possible. |
| NFR-AVAIL-003 | When AI is down, commerce WITHOUT assistant SHALL continue.        |
| NFR-AVAIL-004 | When notifications fail, commerce transactions SHALL still commit. |
| NFR-AVAIL-005 | Redis loss SHALL NOT destroy order/payment/inventory correctness.  |

## DR / backup

| ID         | Requirement                                                            | Source             |
| ---------- | ---------------------------------------------------------------------- | ------------------ |
| NFR-DR-001 | Foundation RPO SHALL be ≤ 24 hours until tightened for payments.       | DR doc / 0006/0019 |
| NFR-DR-002 | Foundation RTO SHALL be ≤ 4 hours until drill-proven otherwise.        | DR doc             |
| NFR-DR-003 | Restore drills SHALL be completed before production customer payments. | 0019               |

## Observability / audit / integrity

| ID          | Requirement                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| NFR-OBS-001 | Requests SHALL carry/propagate requestId and correlationId.                                                   |
| NFR-AUD-001 | Security and financial events SHALL be durably audited in PostgreSQL.                                         |
| NFR-INT-001 | Financial and inventory updates SHALL use strong consistency in PostgreSQL transactions as specified by ADRs. |

## Accessibility / SEO / DX

| ID           | Requirement                                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| NFR-A11Y-001 | Customer web core journeys SHOULD meet WCAG 2.2 AA targets (ADR-0007).         |
| NFR-SEO-001  | Public PLP/PDP SHALL support server-rendered metadata from catalog.            |
| NFR-DX-001   | CI SHALL run lint, typecheck, test, and security scans per ADR-0003/0019/0020. |

## Scalability / resilience

| ID            | Requirement                                                      |
| ------------- | ---------------------------------------------------------------- |
| NFR-SCALE-001 | API SHALL be horizontally scalable (stateless app tier).         |
| NFR-RES-001   | External provider calls SHALL have timeouts and bounded retries. |
| NFR-RES-002   | Provider HTTP SHALL NOT run inside long DB transactions.         |
