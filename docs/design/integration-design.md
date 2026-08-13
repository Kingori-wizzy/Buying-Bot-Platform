# Integration design

**Aligns with:** ADR-0016, 0011, 0013, 0014, 0015, 0009

## Pattern

```text
Domain/Application → Port → Adapter → External provider SDK/HTTP
```

## Ports (selected)

PaymentProvider, DeliveryProvider, EmailProvider, SmsProvider,
WhatsAppProvider, ModelProvider, ObjectStorage, ShippingQuote,
TaxCalculator.

## Cross-cutting

- Secrets via env/secret manager
- Webhooks: verify → persist → ack → async
- Timeouts, retries with jitter, circuit breakers on sustained failure
- Reconciliation jobs for payments/delivery
- Channel identity linking for omnichannel (future WA commerce)

Domain MUST NOT import Daraja/Stripe/WhatsApp/LLM SDK types.
