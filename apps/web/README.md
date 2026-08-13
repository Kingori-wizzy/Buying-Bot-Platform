# `@buying-bot/web`

Customer storefront — Next.js App Router (M13 / ADR-0007).

## Responsibility

Shopper-facing catalog, search, cart, checkout, auth, and order status against
`apps/api` via `@buying-bot/sdk`. Prices and payment status are **API-authored
only**.

## Run locally

```bash
# API on :3000 first
pnpm --filter @buying-bot/api dev

# Storefront on :3001
pnpm --filter @buying-bot/web dev
```

Env (see root `.env.example`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

CORS already allows `http://localhost:3001`.

## Routes

| Path                 | Purpose                         |
| -------------------- | ------------------------------- |
| `/`                  | Home                            |
| `/products`          | Product list (PLP)              |
| `/products/[slug]`   | Product detail (PDP + metadata) |
| `/search`            | Search                          |
| `/cart`              | Cart (cookie credentials)       |
| `/checkout`          | Checkout initiate               |
| `/orders/[id]`       | Order status poll               |
| `/login` `/register` | Customer auth                   |

## Scripts

| Script           | Purpose               |
| ---------------- | --------------------- |
| `pnpm dev`       | `next dev -p 3001`    |
| `pnpm build`     | `next build`          |
| `pnpm start`     | `next start -p 3001`  |
| `pnpm typecheck` | `tsc --noEmit`        |
| `pnpm test`      | Vitest helpers        |
| `pnpm clean`     | Remove `.next` / dist |

## Notes

- Prefer direct Nest calls with `credentials: 'include'` (no Express BFF).
- CSRF: SDK fetches `/v1/auth/csrf` and sends `x-csrf-token` on mutations.
- AI chat is **out of scope** (M15+).
