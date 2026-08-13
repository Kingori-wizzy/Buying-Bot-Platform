# Observability design

**Aligns with:** ADR-0017, 0004 ops shells

## Implemented (foundation)

Structured JSON logs, redaction hooks, request/correlation IDs on ops
server, `/health`, `/health/live`, `/health/ready`.

## Planned

OpenTelemetry traces/metrics; dashboards/alerts; queue/DB/Redis/provider
RED metrics; business KPIs (checkout, pay confirm, fulfillment); PII
redaction policy enforcement in product APIs.

## Degradation matrix

Search/AI/notify/courier/Redis failures degrade per ADR-0017; PG required
for API readiness.
