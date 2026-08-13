# Payment incident runbook

## Symptoms

- STK initiate failures, webhook timeouts, stuck `PENDING_PAYMENT`, duplicate charges risk

## Immediate actions

1. Check `PAYMENTS_ENABLED` and provider health.
2. If provider outage: set `PAYMENTS_ENABLED=false` on api (fail closed) via env redeploy.
3. Do **not** manually mark orders paid without reconcile evidence.
4. Inspect outbox / payment rows; run worker reconcile cycle.
5. Preserve webhook payloads and request ids.

## Reconcile

- Worker payment reconcile interval (env) + admin outbox reprocess (`system:manage`)
- Idempotent webhook handler must remain the source of truth for confirmation

## EXTERNAL

- Daraja portal status, shortcode locks, callback URL DNS/TLS
- Finance approval for manual refunds / adjustments

## Exit

Smoke checkout in sandbox; document timeline in incident brief.
