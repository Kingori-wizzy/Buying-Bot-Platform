# `@buying-bot/admin`

Admin operations portal — Next.js App Router (M14 / ADR-0007).

## Responsibility

Catalog, inventory, order lookup, and promotions UX for internal users. Uses
the **admin** cookie realm + MFA. Nav is role/permission-gated for UX only —
**all mutations are authorized by Nest guards**.

## Run locally

```bash
# API on :3000 first
pnpm --filter @buying-bot/api dev

# Admin on :3004 (matches CORS_ORIGIN)
pnpm --filter @buying-bot/admin dev
```

Env:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Routes

| Path            | Purpose                                       |
| --------------- | --------------------------------------------- |
| `/login`        | Admin login + MFA enroll/challenge            |
| `/`             | Dashboard / session summary                   |
| `/catalog`      | Product list (ACTIVE via public list for now) |
| `/catalog/new`  | Create product (admin API)                    |
| `/catalog/[id]` | Edit product (admin API)                      |
| `/inventory`    | List + adjust                                 |
| `/orders`       | Order id lookup                               |
| `/orders/[id]`  | Order detail                                  |
| `/promotions`   | Create promotion / coupon                     |

## Scripts

| Script           | Purpose               |
| ---------------- | --------------------- |
| `pnpm dev`       | `next dev -p 3004`    |
| `pnpm build`     | `next build`          |
| `pnpm start`     | `next start -p 3004`  |
| `pnpm typecheck` | `tsc --noEmit`        |
| `pnpm test`      | Vitest helpers        |
| `pnpm clean`     | Remove `.next` / dist |

## Known API gaps (UI notes)

- No admin catalog **list** (drafts) — list uses public ACTIVE products.
- No admin **order list** / promotions list — lookup/create only.
