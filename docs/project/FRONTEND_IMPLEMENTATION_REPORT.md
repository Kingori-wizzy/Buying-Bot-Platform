# Frontend implementation report

**Date:** 2026-08-13  
**Release:** `0.1.0-rc.2` (+ frontend UX pass)  
**Related:** `FRONTEND_EXPERIENCE_AUDIT.md`

## 1. What the frontend looked like before

- Thin API-wired scaffolds with developer-oriented copy
- Undeclared/unloaded IBM Plex fonts; cream/green generic chrome
- Flat nav without cart badge, account session, or AI entry
- Homepage as catalog count smoke test
- PLP/PDP without merchandising chrome or related products
- Cart table-only; single-form checkout; sparse order poll
- Assistant single-turn, not linked from nav, weak 503 UX
- Admin dashboard = session dump; inventory JSON dump
- `packages/ui` tokens unused / out of sync

## 2. What was improved

| Surface        | Changes                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Design tokens  | Expanded `packages/ui` (graphite + teal Kenya-ready palette; display/sans families)                                 |
| Storefront CSS | Full visual system: hero, cards, chat, checkout steps, M-Pesa status chips, responsive nav                          |
| Typography     | `next/font` **Syne** + **DM Sans**                                                                                  |
| Navigation     | `SiteHeader`: search, cart count, AI, orders/logout when authenticated, mobile menu                                 |
| Homepage       | Brand-first full-bleed hero, AI CTA, search, featured products, trust/M-Pesa messaging                              |
| Catalog        | Filter `q`, pagination, product cards, empty/error states                                                           |
| PDP            | Gallery panel, offers list, qty ATC, related products, AI link                                                      |
| Cart           | Line cards, qty controls, empty state, clearer API-subtotal copy                                                    |
| Checkout       | 3-step flow (review → M-Pesa/delivery → confirm); server-authority warnings                                         |
| Orders         | `/orders` history via `listMyOrders`; polished M-Pesa waiting/success/failure/timeout UX on `/orders/[id]`          |
| AI assistant   | Multi-turn thread, tool status, API-hydrated product cards via `searchProducts`, Add to Cart, 503 graceful fallback |
| Auth pages     | Panel chrome + `main` landmarks                                                                                     |
| Route states   | `loading.tsx`, `error.tsx`, `not-found.tsx`                                                                         |
| Admin          | Fonts, denser chrome, dashboard KPIs from live APIs, inventory table (not JSON), clearer nav                        |

## 3. Routes that work (demonstrate)

### Storefront — http://localhost:3001

| Route                 | Purpose                       |
| --------------------- | ----------------------------- |
| `/`                   | Hero + featured + trust       |
| `/products`           | Catalog grid + filter + pager |
| `/products/[slug]`    | PDP                           |
| `/search?q=`          | Search results                |
| `/cart`               | Cart                          |
| `/checkout`           | Multi-step checkout           |
| `/orders`             | Order history (auth)          |
| `/orders/[id]`        | M-Pesa / payment status poll  |
| `/assistant`          | AI shopping assistant         |
| `/login`, `/register` | Customer auth                 |

### Admin — http://localhost:3004

| Route                                       | Purpose             |
| ------------------------------------------- | ------------------- |
| `/login`                                    | Admin + MFA         |
| `/`                                         | Dashboard KPIs      |
| `/catalog`, `/catalog/new`, `/catalog/[id]` | Products            |
| `/inventory`                                | Balances + adjust   |
| `/orders`, `/orders/[id]`                   | Order lookup        |
| `/promotions`                               | Promo/coupon create |

## 4. Backend APIs connected

- Auth: csrf, register, login, logout, me, MFA (admin)
- Catalog: `listProducts`, `getProduct`, `searchProducts`
- Cart: get/add/update/remove/merge
- Checkout / orders: `checkout`, `getOrder`, `listMyOrders`
- AI: `POST /v1/ai/chat` (via SDK `chat`)
- Admin: catalog CRUD, inventory list/adjust, promotions/coupons, `adminPing`

## 5. AI functionality connected

- Storefront `/assistant` → Nest `POST /v1/ai/chat`
- Parallel catalog hydration via `searchProducts` (authoritative prices/offers)
- 503 → friendly unavailable message; commerce links remain usable
- No invented prices/stock in UI; no provider keys in frontend

**Not yet:** SSE streaming client (API supports stream; SDK still uses non-stream `chat`)

## 6. Remaining gaps / externally blocked

| Gap                                             | Notes                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Tailwind (ADR-0007)                             | Still CSS-variable system; tokens aligned — Tailwind migration deferred to avoid mid-RC churn |
| Product media URLs                              | API/seed rarely supplies images; CSS placeholders used                                        |
| Category taxonomy nav                           | Needs category list API richness / seed                                                       |
| Dedicated payment initiate SDK                  | Checkout + outbox initiate; no separate STK client method                                     |
| Live M-Pesa STK                                 | Requires `PAYMENTS_ENABLED` + Daraja secrets (EXTERNAL)                                       |
| Admin customers/payments/reports/settings pages | No matching list APIs in SDK yet                                                              |
| Admin DRAFT catalog list                        | Public list is ACTIVE-only                                                                    |
| Full WCAG audit / axe CI                        | Targeted improvements only this pass                                                          |
| Measured LCP/INP                                | Not fabricated — run Lighthouse against staging when available                                |

## 7. Verification results

| Check                                       | Result                                                    |
| ------------------------------------------- | --------------------------------------------------------- |
| `pnpm --filter @buying-bot/ui build`        | PASS                                                      |
| `pnpm --filter @buying-bot/web typecheck`   | PASS                                                      |
| `pnpm --filter @buying-bot/admin typecheck` | PASS                                                      |
| `pnpm --filter @buying-bot/web test`        | PASS                                                      |
| `pnpm --filter @buying-bot/admin test`      | PASS                                                      |
| `pnpm --filter @buying-bot/api test`        | PASS (retry; earlier run hit DB hook timeouts under load) |
| `pnpm run security:gate`                    | PASS                                                      |
| `pnpm run integrity`                        | PASS                                                      |
| `pnpm --filter @buying-bot/web build`       | PASS with `NODE_ENV=production`                           |
| `pnpm --filter @buying-bot/admin build`     | PASS with `NODE_ENV=production`                           |
| ESLint web/admin/ui                         | PASS after fixes                                          |

**Note:** Do not set `NODE_ENV` inside `.env` for Next apps — it breaks `next build` (see `.env.example`). Set `NODE_ENV` on the process when starting API/worker/ai-service instead.

Full `pnpm run verify` should be run with a clean process env (no `.env`-injected `NODE_ENV=development`) for a green CI-equivalent local gate.

## 8. Demo URLs (local)

With compose Postgres/Redis + API/web/admin running:

1. http://localhost:3001 — homepage hero
2. http://localhost:3001/products — catalog
3. http://localhost:3001/assistant — AI + product cards
4. http://localhost:3001/cart → `/checkout` → `/orders/[id]` — M-Pesa wait UX
5. http://localhost:3004 — admin dashboard KPIs

## Non-goals honored

- No backend/ADR/schema rewrites
- No fake production catalog hardcoding
- No client-authoritative money or payment status
- No payment/AI secrets in the browser
