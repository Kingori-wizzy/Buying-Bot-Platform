# Frontend Experience Audit — Buying Bot Platform

**Version:** 0.1.0-rc.2  
**Audited:** 2026-08-18  
**Auditor:** AI coding agent (post-M25 hardening)

---

## Methodology

All frontend code in `apps/web`, `apps/admin`, `packages/ui`, `packages/sdk`, and shared config was inspected. Findings are compared against:

- **SRS** (`docs/project/SRS.md`)
- **SDS** (`docs/project/SDS.md`)
- **Frontend Design** (`docs/project/FRONTEND_DESIGN.md`)
- **API Design** (`docs/project/API_DESIGN.md`)
- **ADR-0007** (Next.js App Router), **ADR-0009** (CSS Custom Properties), **ADR-0010** (React Server Components), **ADR-0011** (client islands), **ADR-0012** (design tokens)

---

## 1. Global Navigation

| Item                     | Status         | Notes                                                      |
| ------------------------ | -------------- | ---------------------------------------------------------- |
| Buying Bot branding      | ✅ IMPLEMENTED | `SiteHeader` renders brand link with display font          |
| Product search           | ✅ IMPLEMENTED | Search form in header, routes to `/search?q=`              |
| Cart with badge          | ✅ IMPLEMENTED | Cart count badge hydrated from API                         |
| AI assistant entry       | ✅ IMPLEMENTED | Direct nav link                                            |
| Account (login / logout) | ✅ IMPLEMENTED | Conditional on `me` session                                |
| Orders link              | ✅ IMPLEMENTED | Shown when authenticated                                   |
| Mobile responsive toggle | ✅ IMPLEMENTED | `nav-toggle` hidden until ≤ 820 px breakpoint              |
| Active link highlighting | ❌ MISSING     | No `aria-current` or active class on current route         |
| `.linkish` CSS class     | ❌ BROKEN      | Button with class `linkish` has no CSS rule → unstyled     |
| Category navigation      | ❌ MISSING     | No category links (API doesn't expose category browse yet) |
| `Register` link          | ✅ IMPLEMENTED | Shown when unauthenticated                                 |

---

## 2. Homepage (`/`)

| Item                     | Status         | Notes                                                |
| ------------------------ | -------------- | ---------------------------------------------------- |
| Hero section             | ✅ IMPLEMENTED | Full-bleed dark hero with gradient and grid overlay  |
| AI assistant CTA         | ✅ IMPLEMENTED | Primary CTA button in hero                           |
| Product search           | ✅ IMPLEMENTED | Search panel below hero                              |
| Featured products (RSC)  | ✅ IMPLEMENTED | `listProducts` called server-side; 8 items           |
| Trust / M-Pesa messaging | ✅ IMPLEMENTED | Four trust items grid                                |
| Category browse          | ❌ MISSING     | API doesn't expose categories; intentionally omitted |
| Promotions/deals section | ❌ MISSING     | No promotions API integrated on homepage             |
| Catalog error state      | ✅ IMPLEMENTED | "Catalog temporarily unavailable" message            |
| Empty catalog state      | ✅ IMPLEMENTED | "No featured products yet" with CTA                  |
| Open Graph metadata      | ✅ IMPLEMENTED | Description set in layout metadata                   |

---

## 3. Product Listing Page (`/products`)

| Item                 | Status         | Notes                                                             |
| -------------------- | -------------- | ----------------------------------------------------------------- |
| Product grid         | ✅ IMPLEMENTED | `card-list` responsive grid                                       |
| Product cards        | ✅ IMPLEMENTED | Name, brand, description, price, View link                        |
| Add to cart from PLP | ❌ MISSING     | ProductCard has no ATC — user must go to PDP                      |
| Search/filter        | ✅ IMPLEMENTED | `?q=` param filters via API                                       |
| Sorting              | ❌ MISSING     | No sort dropdown; API supports it but UI doesn't                  |
| Price filter         | ❌ MISSING     | No price range input                                              |
| Availability filter  | ❌ MISSING     | Not in API or UI                                                  |
| Pagination           | ✅ IMPLEMENTED | Previous/Next with page state                                     |
| Loading skeleton     | ❌ MISSING     | Route-level `loading.tsx` exists but PLP has no in-page skeletons |
| Empty state          | ✅ IMPLEMENTED | Dashed empty state with clear filter CTA                          |
| Error state          | ✅ IMPLEMENTED | Error paragraph with `role="alert"`                               |

---

## 4. Product Detail Page (`/products/[slug]`)

| Item                    | Status                   | Notes                                                  |
| ----------------------- | ------------------------ | ------------------------------------------------------ |
| Product name / brand    | ✅ IMPLEMENTED           | Display font title, muted brand                        |
| Gallery                 | ⚠️ PARTIALLY IMPLEMENTED | Gradient placeholder with product name; no real image  |
| Short description       | ✅ IMPLEMENTED           | Rendered as muted paragraph                            |
| Authoritative price     | ✅ IMPLEMENTED           | From `firstOfferPrice`; note explains server authority |
| Multiple offers listing | ✅ IMPLEMENTED           | Shown when >1 offer exists                             |
| Quantity selector       | ✅ IMPLEMENTED           | `AddToCartButton` has qty input                        |
| Add to cart             | ✅ IMPLEMENTED           | `AddToCartButton` component                            |
| Buy now                 | ✅ IMPLEMENTED           | Link to `/checkout`                                    |
| Ask AI about this       | ✅ IMPLEMENTED           | Link to `/assistant`                                   |
| Variant selection       | ⚠️ PARTIALLY IMPLEMENTED | Offers listed but no UI to select variant              |
| Stock/availability      | ❌ MISSING               | No stock count or "In stock" indicator                 |
| Specifications          | ❌ MISSING               | No spec table (API attributes not wired)               |
| Reviews                 | ❌ MISSING               | Not in API                                             |
| Related products        | ✅ IMPLEMENTED           | 4 items from `listProducts` (not semantically related) |
| 404 handling            | ✅ IMPLEMENTED           | `notFound()` on PlatformApiError 404                   |
| Breadcrumb              | ✅ IMPLEMENTED           | Products / ProductName crumb                           |
| Open Graph              | ✅ IMPLEMENTED           | `generateMetadata` sets title + description            |

---

## 5. Cart (`/cart`)

| Item                         | Status                   | Notes                                            |
| ---------------------------- | ------------------------ | ------------------------------------------------ |
| Cart lines                   | ✅ IMPLEMENTED           | Product name, unit price, quantity, line total   |
| Quantity update              | ✅ IMPLEMENTED           | `onBlur` triggers `updateCartItem`               |
| Remove item                  | ✅ IMPLEMENTED           | Remove button calls `removeCartItem`             |
| Cart subtotal                | ✅ IMPLEMENTED           | Summed from API line totals                      |
| Loading skeleton             | ✅ IMPLEMENTED           | Skeleton while loading                           |
| Empty state                  | ✅ IMPLEMENTED           | Empty cart with shopping CTA                     |
| Error state                  | ✅ IMPLEMENTED           | Error message with `role="alert"`                |
| Product image                | ⚠️ PARTIALLY IMPLEMENTED | Gradient `cart-thumb` placeholder; no real image |
| Variant name in line         | ❌ MISSING               | `CartLine` doesn't expose variant                |
| Quantity +/− stepper buttons | ❌ MISSING               | Only a number input; no explicit +/− buttons     |
| Checkout CTA                 | ✅ IMPLEMENTED           | "Proceed to checkout" button                     |
| Delivery estimate            | ❌ MISSING               | API doesn't return ETA                           |

---

## 6. Checkout (`/checkout`)

| Item                          | Status         | Notes                                              |
| ----------------------------- | -------------- | -------------------------------------------------- |
| Multi-step UI                 | ✅ IMPLEMENTED | 3 steps: Cart review → Delivery & M-Pesa → Confirm |
| Step pills indicator          | ✅ IMPLEMENTED | Active step highlighted                            |
| M-Pesa MSISDN input           | ✅ IMPLEMENTED | E.164 pattern validation                           |
| Shipping method code          | ✅ IMPLEMENTED | Input with default `FLAT`                          |
| Coupon code input             | ✅ IMPLEMENTED | Optional field                                     |
| Backend-authoritative warning | ✅ IMPLEMENTED | Warning banner before submit                       |
| Order creation                | ✅ IMPLEMENTED | Calls `sdk.checkout()`                             |
| Redirect to order status      | ✅ IMPLEMENTED | Routes to `/orders/[id]`                           |
| Error state                   | ✅ IMPLEMENTED | Error message                                      |
| Empty cart guard              | ✅ IMPLEMENTED | Shows "Add items" if cart empty                    |
| Guest checkout                | ❌ MISSING     | Requires auth; no guest flow                       |
| Address fields                | ❌ MISSING     | No delivery address form (API may not require it)  |
| Tax line                      | ❌ MISSING     | Server resolves; display not shown before submit   |

---

## 7. M-Pesa (`/orders/[id]`)

| Item                      | Status         | Notes                                    |
| ------------------------- | -------------- | ---------------------------------------- |
| Payment status display    | ✅ IMPLEMENTED | Status chip (pending / success / failed) |
| STK Push pending state    | ✅ IMPLEMENTED | Elapsed seconds counter + retry          |
| Payment success state     | ✅ IMPLEMENTED | Success alert                            |
| Payment failed / timeout  | ✅ IMPLEMENTED | Danger alert with retry                  |
| Phone number display      | ❌ MISSING     | Order detail doesn't show MSISDN used    |
| Amount display            | ✅ IMPLEMENTED | Grand total from `financialSnapshot`     |
| Retry checkout            | ✅ IMPLEMENTED | Link back to `/checkout`                 |
| Never exposes credentials | ✅ IMPLEMENTED | No payment keys in browser               |

---

## 8. AI Shopping Assistant (`/assistant`)

| Item                        | Status                  | Notes                                         |
| --------------------------- | ----------------------- | --------------------------------------------- |
| Conversational UI           | ✅ IMPLEMENTED          | Chat bubbles, thread scroll, aria-live        |
| Multi-turn history          | ✅ IMPLEMENTED          | `turns` array in state                        |
| Product cards in replies    | ✅ IMPLEMENTED          | Cards hydrated from `searchProducts` API      |
| Add to cart from card       | ✅ IMPLEMENTED          | `AddToCartButton` inside card                 |
| Tool state indicator        | ✅ IMPLEMENTED          | Shows current tool phase text + skeleton      |
| Typing/loading indicator    | ✅ IMPLEMENTED          | Skeleton shimmer in assistant bubble          |
| 503 AI unavailable fallback | ✅ IMPLEMENTED          | Graceful fallback + catalog search results    |
| 401 auth error handling     | ✅ IMPLEMENTED          | "Sign in" message                             |
| Error state                 | ✅ IMPLEMENTED          | Generic error with retry                      |
| Pre-filled default message  | ⚠️ NEEDS UX IMPROVEMENT | Input pre-loaded with example — can confuse   |
| Streaming response          | ❌ MISSING              | Chat API is not streaming; full response only |
| Comparison feature          | ❌ MISSING              | No side-by-side compare                       |
| Suggested prompts           | ❌ MISSING              | No conversation starters shown                |
| Never invents price/stock   | ✅ IMPLEMENTED          | Cards use API data; disclaimer displayed      |

---

## 9. Authentication (`/login`, `/register`)

| Item                       | Status                   | Notes                                              |
| -------------------------- | ------------------------ | -------------------------------------------------- |
| Login form                 | ✅ IMPLEMENTED           | Email/password, session cookie, `router.refresh()` |
| Register form              | ✅ IMPLEMENTED           | Email/password, auto-login on success              |
| Error handling             | ✅ IMPLEMENTED           | API errors shown in UI                             |
| Redirect after auth        | ✅ IMPLEMENTED           | Returns to home or intended page                   |
| MFA flow                   | ⚠️ PARTIALLY IMPLEMENTED | Backend requires TOTP; UI has no TOTP input        |
| Password visibility toggle | ❌ MISSING               | No show/hide toggle                                |
| Forgot password            | ❌ MISSING               | No reset flow                                      |

---

## 10. Orders (`/orders`, `/orders/[id]`)

| Item                | Status         | Notes                                 |
| ------------------- | -------------- | ------------------------------------- |
| Order history list  | ✅ IMPLEMENTED | Table with ID, status, total          |
| Order detail        | ✅ IMPLEMENTED | Status, payment state, M-Pesa polling |
| Auth guard          | ✅ IMPLEMENTED | 401 caught; shows login CTA           |
| Loading skeleton    | ✅ IMPLEMENTED | Skeleton div while fetching           |
| Empty state         | ✅ IMPLEMENTED | "No orders yet" with shopping CTA     |
| Line items on order | ❌ MISSING     | Detail page doesn't show order lines  |
| Shipping address    | ❌ MISSING     | Not exposed in current API response   |

---

## 11. Admin Dashboard (`/` admin)

| Item                | Status         | Notes                                               |
| ------------------- | -------------- | --------------------------------------------------- |
| KPI cards           | ✅ IMPLEMENTED | Products, inventory rows, API ping, MFA             |
| Live API data       | ✅ IMPLEMENTED | No fabricated values                                |
| Quick links         | ✅ IMPLEMENTED | Catalog, inventory, orders, promotions              |
| Charts              | ❌ MISSING     | No chart library; data volume too small for dev env |
| Recent orders       | ❌ MISSING     | Orders API not surfaced on dashboard                |
| Session info        | ✅ IMPLEMENTED | Subject ID, roles, MFA status                       |
| Sidebar active link | ❌ MISSING     | No active state on current nav item                 |
| Loading state       | ✅ IMPLEMENTED | "Loading session…" text                             |

---

## 12. Admin Catalog (`/catalog`)

| Item                   | Status         | Notes                                |
| ---------------------- | -------------- | ------------------------------------ |
| Product list table     | ✅ IMPLEMENTED | Name, slug, status, price, edit link |
| Create product         | ✅ IMPLEMENTED | Form at `/catalog/new`               |
| Edit product           | ✅ IMPLEMENTED | Form at `/catalog/[id]`              |
| Loading / empty states | ❌ MISSING     | No skeleton or empty message         |
| Pagination             | ❌ MISSING     | Hardcoded 50-item limit              |
| Search                 | ❌ MISSING     | No filter input                      |

---

## 13. Admin Inventory (`/inventory`)

| Item                   | Status                   | Notes                             |
| ---------------------- | ------------------------ | --------------------------------- |
| Inventory table        | ✅ IMPLEMENTED           | SKU, location, on-hand, reserved  |
| Permission guard       | ✅ IMPLEMENTED           | Permission check before rendering |
| Loading / empty states | ⚠️ PARTIALLY IMPLEMENTED | Minimal                           |
| Adjust stock           | ❌ MISSING               | View-only; no adjust form         |

---

## 14. Design System (`packages/ui`)

| Item                     | Status         | Notes                                                         |
| ------------------------ | -------------- | ------------------------------------------------------------- |
| Color tokens             | ✅ IMPLEMENTED | `defaultTokens` + `adminTokens` in `packages/ui/src/index.ts` |
| Typography tokens        | ✅ IMPLEMENTED | `fontFamily.sans` (DM Sans) + `fontFamily.display` (Syne)     |
| Spacing tokens           | ✅ IMPLEMENTED | `xs/sm/md/lg/xl`                                              |
| Radius tokens            | ✅ IMPLEMENTED | `sm/md/lg`                                                    |
| CSS Custom Properties    | ✅ IMPLEMENTED | Applied via `globals.css` in each app per ADR-0009            |
| Button variants          | ✅ IMPLEMENTED | `.btn`, `.btn-secondary`, `.btn-ghost`                        |
| Alert variants           | ✅ IMPLEMENTED | `.alert`, `.alert-success`, `.alert-warning`, `.alert-error`  |
| Skeleton                 | ✅ IMPLEMENTED | Shimmer animation                                             |
| Badges                   | ✅ IMPLEMENTED | `.badge`, `.status-chip` (pending/failed)                     |
| Tables                   | ✅ IMPLEMENTED | `.table`, `.table-wrap`                                       |
| Cards                    | ✅ IMPLEMENTED | `.product-card`, `.kpi-card`, `.panel`                        |
| Forms                    | ✅ IMPLEMENTED | `.field`, inputs, labels                                      |
| Stack / Grid utilities   | ✅ IMPLEMENTED | `.stack`, `.card-list`, `.trust-grid`, `.kpi-grid`            |
| Shared component library | ❌ MISSING     | All components are per-app; no cross-app React components     |
| Dialogs / Modals         | ❌ MISSING     | No modal/dialog component                                     |
| Tailwind                 | ❌ NOT USED    | ADR-0009 chose CSS Custom Properties; Tailwind not adopted    |

---

## 15. Responsive Design

| Surface             | Status                          | Notes                                 |
| ------------------- | ------------------------------- | ------------------------------------- |
| Global header       | ✅ IMPLEMENTED                  | Hamburger at ≤820 px                  |
| Homepage hero       | ✅ IMPLEMENTED                  | `clamp()` typography                  |
| Product grid        | ✅ IMPLEMENTED                  | `auto-fill minmax(230px, 1fr)`        |
| PDP two-column      | ✅ IMPLEMENTED                  | Collapses to single column at ≤820 px |
| Cart lines          | ✅ IMPLEMENTED                  | Collapses to 64 px thumb at ≤820 px   |
| Checkout steps      | ✅ IMPLEMENTED                  | `flex-wrap`                           |
| Admin sidebar       | ✅ IMPLEMENTED                  | Stacks at ≤800 px                     |
| Admin tables        | ✅ IMPLEMENTED                  | `overflow-x: auto` on `.table-wrap`   |
| Horizontal overflow | ✅ No overflow on tested routes |                                       |

---

## 16. Accessibility

| Item                     | Status                   | Notes                                                                    |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------ |
| Skip link                | ✅ IMPLEMENTED           | `#main` target on all pages                                              |
| Semantic HTML            | ✅ IMPLEMENTED           | `<main>`, `<header>`, `<nav>`, `<footer>`, `<article>`, `<section>`      |
| `<label>` on all inputs  | ✅ IMPLEMENTED           | Visible or `.sr-only` labels                                             |
| `focus-visible` styles   | ✅ IMPLEMENTED           | 2 px outline in accent color                                             |
| `aria-live` on chat      | ✅ IMPLEMENTED           | `aria-live="polite"` on chat thread                                      |
| `role="alert"` on errors | ✅ IMPLEMENTED           | On error paragraphs                                                      |
| `aria-label` on nav      | ✅ IMPLEMENTED           | `aria-label="Primary"`                                                   |
| Color contrast           | ⚠️ NEEDS REVIEW          | Teal accent (#0f766e) on white (#fff): 4.6:1 — passes AA for normal text |
| `aria-current` on nav    | ❌ MISSING               | No current-page indicator in nav                                         |
| Admin `.sr-only` class   | ❌ MISSING               | Not defined in `apps/admin/app/globals.css`                              |
| Image alt text           | ⚠️ PARTIALLY IMPLEMENTED | Thumbs use `aria-hidden`; no real images yet                             |

---

## 17. Performance (RSC / Bundle)

| Item                             | Status         | Notes                                           |
| -------------------------------- | -------------- | ----------------------------------------------- |
| Homepage RSC                     | ✅ IMPLEMENTED | `page.tsx` is async server component            |
| PLP RSC                          | ✅ IMPLEMENTED | Server component; catalog fetched on server     |
| PDP RSC                          | ✅ IMPLEMENTED | Server component with `generateMetadata`        |
| Search RSC                       | ✅ IMPLEMENTED | Server component                                |
| Client islands only where needed | ✅ IMPLEMENTED | Cart, Checkout, Assistant, Header, Orders, Auth |
| `next/font` optimization         | ✅ IMPLEMENTED | DM Sans + Syne via `next/font/google`           |
| Image optimization               | ❌ MISSING     | No `<Image>` usage; no product images           |
| Bundle analysis                  | NOT RUN        | `@next/bundle-analyzer` not configured          |

---

## 18. UX States Matrix

| Page            | Loading            | Empty    | Error  | Unauthorized | Unavailable      |
| --------------- | ------------------ | -------- | ------ | ------------ | ---------------- |
| Homepage        | ✅ (route)         | ✅       | ✅     | —            | ✅ catalog error |
| PLP             | ✅ (route)         | ✅       | ✅     | —            | —                |
| PDP             | ✅ (route)         | —        | ✅ 404 | —            | —                |
| Cart            | ✅ skeleton        | ✅       | ✅     | —            | —                |
| Checkout        | ✅ skeleton        | ✅ empty | ✅     | ⚠️ no guard  | —                |
| Assistant       | ✅ bubble+skeleton | —        | ✅     | ✅ 401       | ✅ 503           |
| Orders list     | ✅ skeleton        | ✅       | ✅     | ✅           | —                |
| Order detail    | —                  | —        | ✅     | —            | —                |
| Admin dashboard | ✅ text            | —        | ✅     | ✅ redirect  | —                |

---

## 19. SDK Surface Used

| SDK method             | Used where                                  |
| ---------------------- | ------------------------------------------- |
| `me()`                 | SiteHeader, AdminShell, orders page         |
| `logout()`             | SiteHeader, AdminShell                      |
| `getCart()`            | SiteHeader, Cart, Checkout                  |
| `addCartItem()`        | AddToCartButton                             |
| `updateCartItem()`     | Cart                                        |
| `removeCartItem()`     | Cart                                        |
| `listProducts()`       | Homepage, PLP, PDP (related), admin catalog |
| `getProduct()`         | PDP                                         |
| `searchProducts()`     | Search page, assistant                      |
| `chat()`               | Assistant                                   |
| `checkout()`           | Checkout                                    |
| `listMyOrders()`       | Orders list                                 |
| `getOrder()`           | Order detail                                |
| `adminPing()`          | Admin dashboard                             |
| `adminListInventory()` | Admin dashboard, inventory page             |

**Unused / not integrated:** `createProduct`, `updateProduct` (admin forms use direct fetch), `adminListOrders`, `adminGetOrder`, `createPromotion`, `listPromotions`.

---

## 20. Priority Improvements Identified

### P0 — Broken / Missing CSS

1. `.linkish` class used in `SiteHeader` but not defined → logout button unstyled
2. `apps/admin/app/globals.css` missing `.sr-only` → admin a11y gap
3. No `aria-current` on active nav links in both apps

### P1 — Critical UX Gaps

4. ProductCard has no Add to Cart — forces click-through for simple purchases
5. PLP has no sort dropdown
6. Assistant pre-filled message should be replaced with suggested prompts
7. Admin sidebar has no active link state
8. Cart qty +/− stepper (more accessible than raw number input)
9. Checkout has no auth guard — shows confusing error when unauthenticated

### P2 — Enhancement

10. Admin catalog: loading/empty states, pagination
11. Order detail: show line items
12. `aria-current="page"` on nav
13. Suggested prompts on assistant welcome
14. Admin orders surfaced on dashboard

---

_End of audit._
