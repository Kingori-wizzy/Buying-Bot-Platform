# `@buying-bot/api`

Backend API — NestJS + Fastify (ADR-0005).

## Responsibility

System-of-record HTTP APIs: health/ops, identity authentication, RBAC/MFA
guards, and commerce modules (catalog → payments). Prisma access goes through
`@buying-bot/database` only. AI services never receive direct DB credentials.

## Stack

- NestJS + `@nestjs/platform-fastify`
- Zod validation via `@buying-bot/validation` (no class-validator)
- Sessions in PostgreSQL; cookies `bb_cust_session` / `bb_admin_session`
- Guest cart cookie `bb_guest_cart` (HttpOnly)
- CSRF double-submit (`bb_csrf` + `x-csrf-token`) + Origin allowlist
- Argon2id passwords; admin TOTP MFA; service JWTs (HS256)
- Integer minor-unit money (`@buying-bot/utils` money helpers); default currency via `DEFAULT_CURRENCY` (KES)

## Structure

```
src/
  app.ts                 # bootstrap(env) → { stop, address }
  app.module.ts
  common/                # filters, pipes, hooks, email, rate-limit
  config/
  health/
  auth/
  admin/
  catalog/
  inventory/
  pricing/
  cart/
  checkout/
  payments/
```

## Health

| Path                       | Purpose                          |
| -------------------------- | -------------------------------- |
| `/health/live`, `/livez`   | Liveness                         |
| `/health/ready`, `/readyz` | Readiness (+ DB when configured) |
| `/health`, `/healthz`      | Aggregate                        |

## Auth (M4–M5)

| Method | Path                        | Notes                                         |
| ------ | --------------------------- | --------------------------------------------- |
| GET    | `/v1/auth/csrf`             | Issue CSRF cookie/token                       |
| POST   | `/v1/auth/register`         | Customer realm                                |
| POST   | `/v1/auth/login`            | `realm: customer \| admin`                    |
| POST   | `/v1/auth/logout`           | Revoke session                                |
| POST   | `/v1/auth/password/forgot`  | Email stub records token                      |
| POST   | `/v1/auth/password/reset`   |                                               |
| POST   | `/v1/auth/email/verify`     |                                               |
| GET    | `/v1/auth/me`               | Authenticated                                 |
| POST   | `/v1/auth/mfa/totp/enroll`  | Admin                                         |
| POST   | `/v1/auth/mfa/totp/confirm` | Returns recovery codes once                   |
| POST   | `/v1/auth/mfa/challenge`    | Sets `mfaSatisfiedAt`                         |
| POST   | `/v1/auth/step-up`          | Password or TOTP                              |
| GET    | `/v1/admin/ping`            | Admin + MFA + `system:manage` or `audit:read` |

## Catalog (M6)

| Method | Path                             | Notes                                      |
| ------ | -------------------------------- | ------------------------------------------ |
| GET    | `/v1/products`                   | Public ACTIVE list (`page`/`pageSize`)     |
| GET    | `/v1/products/:idOrSlug`         | Public PDP                                 |
| GET    | `/v1/categories`                 | Public                                     |
| GET    | `/v1/brands`                     | Public                                     |
| GET    | `/v1/search/products`            | Public FTS (`q`)                           |
| POST   | `/v1/admin/catalog/brands`       | Admin + MFA + `catalog:create`             |
| POST   | `/v1/admin/catalog/categories`   | Admin CRUD                                 |
| POST   | `/v1/admin/catalog/products`     | Creates default variant+SKU                |
| PATCH  | `/v1/admin/catalog/products/:id` |                                            |
| GET    | `/v1/admin/catalog/products/:id` |                                            |
| POST   | `/v1/admin/catalog/offers`       | Price on Offer                             |
| POST   | `/v1/admin/catalog/media`        | MediaAsset + optional product/variant link |

## Inventory (M7)

| Method | Path                             | Notes                      |
| ------ | -------------------------------- | -------------------------- |
| GET    | `/v1/admin/inventory`            | Balances + available       |
| POST   | `/v1/admin/inventory/adjust`     | Idempotent adjust          |
| POST   | `/v1/internal/inventory/reserve` | Admin-gated reserve helper |

## Pricing (M8)

| Method | Path                           | Notes           |
| ------ | ------------------------------ | --------------- |
| POST   | `/v1/admin/pricing/promotions` | Admin           |
| POST   | `/v1/admin/pricing/coupons`    | Admin           |
| POST   | `/v1/pricing/coupons/validate` | Public validate |

## Cart (M9)

| Method | Path                     | Notes                                   |
| ------ | ------------------------ | --------------------------------------- |
| GET    | `/v1/cart`               | Guest or auth; re-resolves offer prices |
| POST   | `/v1/cart/items`         | Add line                                |
| PATCH  | `/v1/cart/items/:lineId` | Update qty                              |
| DELETE | `/v1/cart/items/:lineId` | Remove                                  |
| POST   | `/v1/cart/merge`         | Merge guest → auth on login             |

## Checkout / orders (M10)

| Method | Path                    | Notes                                                |
| ------ | ----------------------- | ---------------------------------------------------- |
| POST   | `/v1/checkout`          | Requires `Idempotency-Key`; PENDING_PAYMENT + outbox |
| GET    | `/v1/orders/me`         | Authenticated list                                   |
| GET    | `/v1/orders/:id`        | Ownership check when bound to user                   |
| POST   | `/v1/orders/:id/cancel` | Before pay; releases reservation                     |

## Payments / webhooks (M11–M12)

| Method | Path                          | Notes                                          |
| ------ | ----------------------------- | ---------------------------------------------- |
| POST   | `/v1/webhooks/payments/mpesa` | HMAC + timestamp; persist receipt; async apply |

Payment initiation runs from outbox (`payment.initiate`) after commit — never inside the checkout DB transaction. Worker polls outbox / expires reservations.

## Scripts

| Script           | Purpose                      |
| ---------------- | ---------------------------- |
| `pnpm build`     | Compile TypeScript → `dist/` |
| `pnpm typecheck` | Typecheck only               |
| `pnpm dev`       | Watch compile                |
| `pnpm test`      | Vitest (unit + integration)  |
| `pnpm start`     | Run `dist/index.js`          |

## Local

```bash
docker compose -f infrastructure/docker/compose/docker-compose.yml up -d postgres redis
# Host port is 5433 to avoid clashing with a local Postgres on 5432
export DATABASE_URL=postgresql://buyingbot:buyingbot@127.0.0.1:5433/buyingbot?schema=public
pnpm --filter @buying-bot/database exec prisma migrate deploy
pnpm --filter @buying-bot/api start
```

## Status

M2–M12 foundation implemented (catalog through webhooks/outbox). Storefront/admin UI and AI product routes are later milestones.
