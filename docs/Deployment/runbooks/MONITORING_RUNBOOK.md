# Monitoring runbook

## Local / staging signals

| Signal    | Path                | Notes           |
| --------- | ------------------- | --------------- |
| Liveness  | `GET /health/live`  | Process up      |
| Readiness | `GET /health/ready` | Dependencies    |
| Metrics   | `GET /metrics`      | Prometheus text |
| Nginx     | `GET /nginx-health` | Staging proxy   |

Example Prometheus scrape: `infrastructure/monitoring/prometheus/prometheus.yml`
Grafana starter: `infrastructure/monitoring/grafana/buying-bot-overview.json`

## Alerting

Centralized Alertmanager / PagerDuty / Opsgenie is **EXTERNAL**. Until then:

1. Watch compose healthchecks.
2. On SEV symptoms, follow [incident-response.md](./incident-response.md).

## Correlation

Prefer request / correlation ids from API logs when diagnosing (ADR-0017).

## OTel

`OTEL_EXPORTER_OTLP_ENDPOINT` optional — no-op without collector (EXTERNAL).
