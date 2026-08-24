# Notifications Production

## Architecture

Order/auth events → outbox/intents → worker → NotificationPort adapters.

A failed email/SMS **must not** roll back a paid order.

## Channels

| Channel  | Suggested path              | Status                                |
| -------- | --------------------------- | ------------------------------------- |
| Email    | SMTP / Postmark-compatible  | Adapter + EXTERNAL credentials        |
| SMS      | Provider API or Kannel+SMPP | EXTERNAL operator required — not free |
| WhatsApp | Business API token          | EXTERNAL                              |

## Env (examples)

```
# SMTP_URL=smtps://user:pass@smtp.example:465
# SMS_PROVIDER_API_KEY=
# WHATSAPP_TOKEN=
```

## Email DNS

Even with Postmark/SMTP: configure **SPF, DKIM, DMARC** on the sending domain (EXTERNAL DNS).

## Dev

Safe console/no-op adapters when credentials absent — do not claim delivery.
