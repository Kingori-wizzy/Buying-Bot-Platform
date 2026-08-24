# Escrow configuration

Escrow is the **only** customer checkout payment rail. M-Pesa/Daraja remains in the codebase as a deferred adapter and **must not** be exposed in customer UX.

This document separates application configuration (what the platform implements) from provider-side requirements (what the company must obtain from the escrow vendor). **No vendor credentials are invented here.**

---

## Application configuration

Set these in `/etc/buyingbot/env.production` (`chmod 600`). Never commit real values.

| Variable                        | Required for live payments        | Purpose                       |
| ------------------------------- | --------------------------------- | ----------------------------- |
| `PAYMENT_PROVIDER`              | yes (`escrow`)                    | Selects the customer rail     |
| `PAYMENTS_ENABLED`              | yes (`true` only when keys exist) | Master switch                 |
| `ESCROW_API_KEY`                | yes                               | Provider API identity         |
| `ESCROW_API_SECRET`             | yes                               | Provider API secret           |
| `ESCROW_BASE_URL`               | yes                               | Provider API origin (HTTPS)   |
| `ESCROW_WEBHOOK_SECRET`         | yes                               | HMAC key for inbound webhooks |
| `ESCROW_ALLOW_TEST_DOUBLE`      | must be `false` in production     | Local/test double only        |
| `WEBHOOK_REPLAY_WINDOW_SECONDS` | optional (default 300)            | Timestamp window              |

Public webhook URL (register with the provider):

`https://<API_DOMAIN>/v1/webhooks/payments/escrow`

Headers verified by the API:

- `x-escrow-signature` — HMAC-SHA256 of `{timestamp}.{rawBody}` (optional `sha256=` prefix)
- `x-escrow-timestamp` — Unix seconds; rejected outside the replay window

Idempotency uses the provider event id (`eventId` / `id`) stored as a payment receipt. Duplicate webhooks do not double-settle.

Without credentials:

- Adapter `configured = false`
- Initiate returns **`ESCROW_NOT_CONFIGURED`**
- Order payment attempt is **FAILED**, never **PAID**
- Checkout and catalog still function

Generic live HTTP shape (must be aligned when vendor docs arrive):

- Initiate: `POST {ESCROW_BASE_URL}/v1/payments`
- Query: `GET {ESCROW_BASE_URL}/v1/payments/{providerReference}`
- Auth: HTTP Basic (`apiKey:apiSecret`)

---

## Escrow provider requirements (EXTERNAL_PREREQUISITE)

Obtain from the company/vendor. Do **not** invent values.

| Item                           | Status in this repo                                                    |
| ------------------------------ | ---------------------------------------------------------------------- |
| Merchant / account ID          | **Not assumed** — add env only if the vendor requires it               |
| Sandbox vs production selector | Use `ESCROW_BASE_URL` (separate sandbox origin if they provide one)    |
| Webhook URL registration       | Human action at the vendor dashboard                                   |
| Callback / return URL          | Checkout passes `returnUrl` when the browser origin is known           |
| Settlement account             | Vendor-side                                                            |
| Signature algorithm            | Implemented as HMAC-SHA256 timestamp+body; confirm with vendor         |
| API version                    | Encoded in `ESCROW_BASE_URL` path if required                          |
| Currency                       | Application sends order currency (default KES)                         |
| Supported payment methods      | Vendor-side                                                            |
| Refund API                     | **Not implemented as a live vendor call** until vendor contract exists |
| Transaction query API          | Adapter `query()` exists against generic `/v1/payments/{id}`           |

---

## What is verified in automated tests

- Fail-closed initiate without keys (`ESCROW_NOT_CONFIGURED`)
- Signed webhook accept / reject (bad signature, missing headers)
- Idempotent duplicate webhook handling
- M-Pesa webhook path is deferred and does not settle customer orders

## What is BLOCKED without company credentials

- Live initiate against a real escrow provider
- Real money movement
- Provider-specific path/header adjustments beyond the generic REST shape
