# Incident response runbook (ADR-0017 / ADR-0019)

## Severity

| Level | Examples                             | Initial response             |
| ----- | ------------------------------------ | ---------------------------- |
| SEV-1 | Payments down, data loss risk        | Page on-call; freeze deploys |
| SEV-2 | AI assistant outage, search degraded | Commerce continues; mitigate |
| SEV-3 | Elevated latency, single-region blip | Observe; open ticket         |

## First 15 minutes

1. Confirm blast radius via `/health/ready`, `/metrics`, and logs (request id / correlation id).
2. Check Postgres and Redis health (compose or managed).
3. If payments: stop new STK initiates if provider is unhealthy; rely on webhook reconcile — see [PAYMENT_INCIDENT_RUNBOOK.md](./PAYMENT_INCIDENT_RUNBOOK.md).
4. If AI: disable storefront assistant CTA; catalog/checkout must keep working — see [AI_INCIDENT_RUNBOOK.md](./AI_INCIDENT_RUNBOOK.md).
5. If security: rotate secrets — see [SECURITY_INCIDENT_RUNBOOK.md](./SECURITY_INCIDENT_RUNBOOK.md).
6. Preserve evidence: recent logs, metrics scrape, failed outbox count.

## Communication

- Customer-facing: prefer status page / banner; never disclose secrets.
- Internal: channel with timeline, commander, scribe.

## Common mitigations

- Restart api/worker/ai-service containers/processes
- Requeue failed outbox (`requeueFailedOutbox` / admin reprocess)
- Roll back last deploy — [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md)
- Database recovery — [DATABASE_RECOVERY.md](./DATABASE_RECOVERY.md)
- Fail closed for missing payment/AI credentials — do not invent success

## Related runbooks

- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)
- [MONITORING_RUNBOOK.md](./MONITORING_RUNBOOK.md)
- [backup-restore.md](./backup-restore.md)

## Post-incident

Write a brief: timeline, root cause, customer impact, action items. File follow-ups before closing SEV-1/2.
