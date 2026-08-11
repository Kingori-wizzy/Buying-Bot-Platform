# `infrastructure/monitoring`

## Purpose

Home for **observability assets**: metrics scrape configs, dashboards, alert rules, and logging pipeline definitions for the platform.

## Folder structure

| Path          | Purpose                                                               |
| ------------- | --------------------------------------------------------------------- |
| `prometheus/` | Scrape configs, recording rules, and service-discovery related assets |
| `grafana/`    | Dashboard JSON/definitions and datasource provisioning stubs          |
| `alerting/`   | Alert rule packs and routing/notification policy definitions          |
| `logging/`    | Log pipeline configs (collectors, parsers, index lifecycle policies)  |

## What belongs here

- Dashboard and alert definitions as code (when authored)
- Metric/log naming conventions documentation
- Non-secret exporter configuration templates

## What does not belong here

- API tokens for Grafana/PagerDuty/etc.
- Production PII in example log payloads
- Application instrumentation code (lives with apps/packages)
