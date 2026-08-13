# API design

**Aligns with:** ADR-0009, 0008, 0011–0015

## Conventions

- Base: `/v1`
- Auth: customer cookie session and/or Bearer; admin realm separate; service JWT for internal
- Validation: Zod; strict DTOs (no mass assignment)
- Errors: `{ error: { code, message, requestId, details? } }`
- Pagination: `page/pageSize` admin; `cursor/limit` catalog/search
- Idempotency: `Idempotency-Key` on checkout/pay/refund
- Headers: `x-request-id`, `x-correlation-id`
- Rate limits per ADR-0008/0009

## Endpoint groups (conceptual)

| Group                                           | Examples                            |
| ----------------------------------------------- | ----------------------------------- |
| `/v1/auth`                                      | register, login, logout, reset, MFA |
| `/v1/me`                                        | profile, addresses, orders          |
| `/v1/products`, `/v1/categories`, `/v1/brands`  | catalog reads                       |
| `/v1/search/products`, `/v1/search/suggestions` | search                              |
| `/v1/cart`                                      | guest/auth cart                     |
| `/v1/checkout`                                  | start/commit                        |
| `/v1/orders`                                    | get, cancel                         |
| `/v1/payments`                                  | initiate status; admin refund       |
| `/v1/promotions`, `/v1/coupons`                 | preview/validate                    |
| `/v1/inventory`                                 | admin adjust                        |
| `/v1/admin/*`                                   | permission-gated ops                |
| `/v1/ai/conversations`                          | chat + SSE stream                   |
| `/v1/webhooks/payments/{provider}`              | raw body HMAC                       |
| `/v1/webhooks/shipping/{provider}`              | delivery                            |
| `/internal/*`                                   | service-only                        |

OpenAPI is authoritative when generated; SDK consumes it. No fake OpenAPI
checked in by this documentation task.
