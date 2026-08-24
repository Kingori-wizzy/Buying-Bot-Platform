# Digital fulfillment

## Flow

1. Customer pays via Escrow webhook (HMAC verified)
2. Order moves to PAID then PROCESSING
3. `digital_fulfillments` rows created per order line (delivery method from Offer)
4. Admin marks fulfillment READY with a **safe** payload (no password/secret/token keys)
5. Customer may receive delivery content only when status is READY/DELIVERED
6. Admin marks DELIVERED; when all lines complete, order → COMPLETED

## Admin APIs

- `GET /v1/admin/orders/:id/fulfillments`
- `POST /v1/admin/orders/fulfillments/:id/ready` `{ "payload": { ... } }`
- `POST /v1/admin/orders/fulfillments/:id/delivered`

## Security

- Never log credentials
- Reject payload keys containing password/secret/token/api_key
- Never expose fulfillment payload to unauthenticated clients before READY
