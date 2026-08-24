# Escrow Production

## Customer UX

Escrow only. **M-Pesa is deferred** from checkout UI.

## Env

```
PAYMENT_PROVIDER=escrow
PAYMENTS_ENABLED=true   # only when keys present
ESCROW_API_KEY=
ESCROW_API_SECRET=
ESCROW_BASE_URL=
ESCROW_WEBHOOK_SECRET=
ESCROW_ALLOW_TEST_DOUBLE=false   # forbidden in staging/production validation
```

## Flow

Checkout → Order → PaymentAttempt → outbox `payment.initiate` → worker/EscrowAdapter  
Webhook `POST /v1/webhooks/payments/escrow` → HMAC verify → idempotent receipt → confirm payment

## Fail-closed

Without credentials: `ESCROW_NOT_CONFIGURED` / payment FAILED — **never** fake paid.

## Webhook

Headers: `x-escrow-signature`, `x-escrow-timestamp`  
Public URL: `https://api.example.com/v1/webhooks/payments/escrow`

Generic HTTP paths under `ESCROW_BASE_URL` must be aligned when vendor docs arrive — see `docs/project/ESCROW_EXTERNAL_PREREQUISITES.md`.
