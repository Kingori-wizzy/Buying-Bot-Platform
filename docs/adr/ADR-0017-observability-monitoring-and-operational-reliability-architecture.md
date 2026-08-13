# ADR-0017: Observability, monitoring, and operational reliability architecture

- Status: **Accepted**
- Date: 2026-08-13
- Deciders: Platform Architecture; accepted by architecture program review on
  2026-08-13
- Aligns with: ADR-0004 ops shells, ADR-0005–ADR-0016 (**Accepted**)
- Scope: Logging, metrics, tracing, health, SLOs, alerting, degradation,
  audit/security event visibility
- Out of scope: Procuring a specific SaaS APM; implementing dashboards in
  code now

## 1. Context / Problem

Multi-app platform (web, admin, api, worker, ai-service) needs correlated
observability without logging secrets or claiming unmeasured SLOs.

## 2. Decision

Adopt **OpenTelemetry-aligned** observability:

- Structured JSON logs (ADR-0004 pattern) with `requestId`, `correlationId`,
  `service`, `level`
- Metrics: RED (rate, errors, duration) + business KPIs
- Distributed tracing across API → worker → ai-service → adapters
- Health: `/live`, `/ready` with dependency checks (PG required for api
  ready; Redis required for queue-dependent readiness per ADR-0006)

## 3. What to observe

| Surface        | Signals                                              |
| -------------- | ---------------------------------------------------- |
| web/admin      | Web vitals (later), client errors (no tokens)        |
| api            | Latency, status codes, authn/z failures, rate limits |
| worker         | Queue depth, processing time, failures, DLQ          |
| ai-service     | Model latency, tokens, tool failures, first-token    |
| PostgreSQL     | Connections, slow queries, locks                     |
| Redis          | Memory, evictions, latency                           |
| BullMQ         | Waiting/active/failed                                |
| Object storage | Upload/download errors                               |
| Providers      | Payment/courier/notify/AI error rates                |

Business: checkout success, payment confirm latency, fulfillment times,
return rate, search zero-results, notification delivery.

## 4. SLIs / SLOs (aspirational targets — unverified)

| SLI                    | Target (aspirational)               |
| ---------------------- | ----------------------------------- |
| API availability       | 99.5% monthly (staging→prod refine) |
| API p95 latency (read) | &lt; 300 ms                         |
| Checkout commit p95    | &lt; 800 ms                         |
| Webhook ack p95        | &lt; 1 s                            |
| AI first token         | &lt; 2 s                            |

Label clearly as **targets**, not measured production facts.

Error budgets: burn alerts before hard outages.

## 5. Logging rules

Never log: passwords, tokens, PAN/CVV/PIN, OTP codes, provider secrets,
raw webhook signing keys. Redact PII in shared sinks. Retain audit events in
PG separately from ephemeral logs.

## 6. Alerting

Page/on-call for: payment confirm failures spike, API 5xx, PG down, queue
DLQ growth, webhook verify failures, disk/backup failures.

## 7. Graceful degradation (accepted)

| Dependency down | Behavior                                                                            |
| --------------- | ----------------------------------------------------------------------------------- |
| Search/FTS      | Exact get-by-id + checkout continue                                                 |
| Redis           | PG still authoritative; cache miss; enqueue via outbox; auth rate-limit fail closed |
| AI              | Commerce without assistant                                                          |
| Notifications   | Commerce completes; intents retry                                                   |
| Courier API     | Orders retain last good shipment state                                              |
| Object storage  | Uploads fail; metadata/ops continue                                                 |

## 8. Incident response

Runbooks (docs): detect → mitigate → communicate → postmortem. Correlate via
correlationId. Security incidents escalate per ADR-0018.

## 9. Alternatives rejected

Only stdout without correlation; metrics without redaction; claiming SLOs as
proven; single bloated APM as architecture lock-in before need.

## 10. Dependencies

All deployables; ADR-0006 health semantics; ADR-0009 correlation headers.

## 11. Decision status

**Accepted.** Indexed in [DECISIONS.md](../DECISIONS.md).
