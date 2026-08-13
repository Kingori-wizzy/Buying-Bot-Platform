# Alert definitions (Prometheus-ready)

Scrape config: `infrastructure/monitoring/prometheus/prometheus.yml`  
Dashboard: `infrastructure/monitoring/grafana/buying-bot-overview.json`

These are **definitions** for operators to load into Alertmanager / Grafana. They are not live alerts without an EXTERNAL monitoring stack.

| Alert                  | Expression (conceptual)                                       | Severity |
| ---------------------- | ------------------------------------------------------------- | -------- |
| ApiHighErrorRate       | `rate(http_requests_errors_total[5m]) > 0.05`                 | page     |
| ApiHighLatency         | `histogram_quantile(0.95, http_request_duration_seconds) > 1` | ticket   |
| AuthFailureSpike       | `rate(auth_failures_total[5m]) > 1`                           | ticket   |
| PaymentConfirmFailures | `rate(payment_confirm_failures_total[5m]) > 0`                | page     |
| WebhookVerifyFailures  | `rate(webhook_verify_failures_total[5m]) > 0`                 | page     |
| OutboxFailedGrowth     | `outbox_failed_count > 0` for 15m                             | page     |
| DatabaseDown           | `up{job="postgres"} == 0`                                     | page     |
| AiServiceDown          | `up{job="ai-service"} == 0`                                   | ticket   |
| InventoryNegative      | integrity job failure                                         | page     |

Wire real metric names from each service `/metrics` after EXTERNAL OTel/Prometheus deployment.
