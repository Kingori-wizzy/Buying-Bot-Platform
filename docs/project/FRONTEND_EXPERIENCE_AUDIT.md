# Frontend experience audit (0.1.0-rc.2)

**Date:** 2026-08-13  
**Scope:** `apps/web`, `apps/admin`, `packages/ui`, SDK/API surface  
**Authority:** Live code + ADR-0007 / 0009–0012 / 0015 + `docs/design/frontend-design.md`  
**Backend contracts:** Unchanged — Nest REST `/v1` via `@buying-bot/sdk`

## Executive verdict

The frontends are **API-correct scaffolds**, not a production AI-commerce experience.
Storefront and admin wire real Nest endpoints but lack brand strength, merchandising,
M-Pesa journey polish, AI productization, shared primitives, and route-level UX states.

## Classification legend

| Status                | Meaning                             |
| --------------------- | ----------------------------------- |
| IMPLEMENTED           | Works end-to-end against API        |
| PARTIALLY IMPLEMENTED | Core path works; major UX gaps      |
| MISSING               | Not present in UI                   |
| BROKEN                | Present but fails or misleads       |
| NEEDS UX IMPROVEMENT  | Functional but below production bar |

## Area matrix

| Area                    | Status                                       | Evidence                                | Notes                                                                          |
| ----------------------- | -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| Global navigation       | PARTIALLY IMPLEMENTED + NEEDS UX IMPROVEMENT | `apps/web/app/layout.tsx`               | Flat links; no cart badge, account, Assistant, mobile drawer, session          |
| Homepage                | NEEDS UX IMPROVEMENT                         | `apps/web/app/page.tsx`                 | Dev smoke copy; no hero, featured grid, trust, M-Pesa messaging                |
| Product listing         | PARTIALLY IMPLEMENTED + NEEDS UX IMPROVEMENT | `apps/web/app/products/page.tsx`        | Live grid; no images, filters, sort UI, pagination, skeletons                  |
| Search                  | PARTIALLY IMPLEMENTED                        | `apps/web/app/search/page.tsx`          | GET `q` + `searchProducts`; weak chrome                                        |
| Product detail          | PARTIALLY IMPLEMENTED                        | `apps/web/app/products/[slug]/page.tsx` | Name/price/ATC; no gallery, variants, stock, related, buy-now                  |
| Cart                    | IMPLEMENTED + NEEDS UX IMPROVEMENT           | `apps/web/app/cart/page.tsx`            | CRUD works; table-only; “Subtotal (API)” is client sum of API lines            |
| Checkout                | PARTIALLY IMPLEMENTED                        | `apps/web/app/checkout/page.tsx`        | MSISDN + coupon → order; no steps, cart review, shipping UI                    |
| M-Pesa UX               | PARTIALLY IMPLEMENTED / MISSING UI           | Order poll only                         | Checkout triggers server initiate when payments enabled; no STK waiting chrome |
| Order status            | PARTIALLY IMPLEMENTED                        | `apps/web/app/orders/[id]/page.tsx`     | Polls 4s; sparse                                                               |
| Order history           | MISSING                                      | SDK `listMyOrders()` unused             | No `/orders` index                                                             |
| Auth (customer)         | PARTIALLY IMPLEMENTED                        | login/register pages                    | No logout/`me` in nav; no password reset UI                                    |
| AI assistant            | PARTIALLY IMPLEMENTED + NEEDS UX IMPROVEMENT | `apps/web/app/assistant/page.tsx`       | Single-turn; not in nav; no product cards; weak 503 UX                         |
| Design system           | MISSING / PARTIAL                            | `packages/ui` tokens only               | No React primitives; fonts undeclared/unloaded; apps diverge                   |
| Tailwind (ADR-0007)     | MISSING                                      | No Tailwind deps                        | Plain CSS variables in apps                                                    |
| Loading / empty / error | PARTIALLY IMPLEMENTED                        | Inline muted/error                      | No `loading.tsx` / `error.tsx` / `not-found.tsx`                               |
| Responsive              | PARTIALLY IMPLEMENTED                        | Header wrap; admin &lt;800px            | Tables overflow; no mobile nav                                                 |
| Accessibility           | PARTIALLY IMPLEMENTED                        | Some labels                             | Weak focus, skip link, live regions                                            |
| Admin shell / MFA       | IMPLEMENTED                                  | `AdminShell`, login MFA                 | Realm + permission gates solid                                                 |
| Admin dashboard         | NEEDS UX IMPROVEMENT                         | `apps/admin/app/page.tsx`               | Session dump; no KPIs from API                                                 |
| Admin catalog           | PARTIALLY IMPLEMENTED                        | public `listProducts`                   | ACTIVE-only; no DRAFT list API in SDK                                          |
| Admin inventory         | PARTIALLY IMPLEMENTED                        | adjust + JSON dump                      | Operator-hostile                                                               |
| Admin orders            | PARTIALLY IMPLEMENTED                        | UUID lookup                             | No list endpoint in SDK                                                        |
| Admin promotions        | PARTIALLY IMPLEMENTED                        | create only                             | Session-local JSON                                                             |
| Fake/hardcoded catalog  | —                                            | None found                              | Correct — uses SDK                                                             |

## SDK methods available vs used

| Method                                           | Web                 | Admin                        |
| ------------------------------------------------ | ------------------- | ---------------------------- |
| Auth (csrf/register/login/logout/me/mfa*)        | login/register only | login/MFA/`me`               |
| `listProducts` / `getProduct` / `searchProducts` | yes                 | catalog list via public list |
| Cart CRUD + merge                                | yes                 | —                            |
| `checkout` / `getOrder`                          | yes                 | order by id                  |
| `listMyOrders`                                   | **unused**          | —                            |
| `chat`                                           | assistant           | —                            |
| Admin catalog/inventory/pricing mutations        | —                   | yes                          |
| `adminPing`                                      | —                   | **unused**                   |
| Payment initiate/status in SDK                   | **none**            | **none**                     |

## Docs vs code (high level)

| Doc expectation (ADR-0007 / frontend-design)         | Code reality                                 |
| ---------------------------------------------------- | -------------------------------------------- |
| Next App Router + RSC catalog                        | Met for home/PLP/PDP/search                  |
| Tailwind + `packages/ui` tokens/primitives           | Tokens only; no Tailwind; primitives missing |
| AI structured product cards / SSE                    | Non-streaming `chat`; text reply only        |
| M-Pesa waiting / poll; never trust thank-you as PAID | Poll exists; UX thin; principle respected    |
| Admin ops tables                                     | Forms + JSON; no analytics                   |

## Priority upgrade backlog (this pass)

1. Design tokens + storefront visual system (brand-first, Kenya-ready, non-generic)
2. Global nav (search, cart, account, Assistant, mobile)
3. Homepage hero + featured products + trust/M-Pesa
4. PLP/PDP/cart/checkout/order polish
5. AI assistant multi-turn + API-hydrated product cards + 503 fallback
6. Admin dashboard KPIs from real APIs + denser ops chrome
7. Route loading/error/empty patterns

## Non-goals (enforced)

- No backend/ADR/schema rewrites
- No invented payment/AI credentials
- No client-authoritative prices/stock/payment status
- No fake production catalog hardcoding
