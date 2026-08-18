# Frontend Implementation Report

**Version:** 0.1.0-rc.2  
**Date:** 2026-08-18  
**Scope:** `apps/web`, `apps/admin`, `packages/ui`

---

## 1. What the Frontend Looked Like Before (Prior Pass)

The previous implementation pass (M0–M25) had already created:

- A full-bleed hero homepage with AI CTA
- `SiteHeader` with cart badge and mobile hamburger
- Product listing, detail, cart, checkout, and orders pages
- AI assistant with multi-turn history and 503 fallback
- Admin dashboard with live KPI cards
- Design tokens (DM Sans + Syne, teal accent, dark admin theme)

**However, it had these gaps (identified by this audit):**

| Issue                                                                                  | Severity     |
| -------------------------------------------------------------------------------------- | ------------ |
| `.linkish` CSS class referenced in `SiteHeader` but not defined anywhere               | **BROKEN**   |
| No `aria-current` on active nav links in web or admin                                  | A11y gap     |
| `ProductCard` had no Add to Cart — PLP was browse-only                                 | UX gap       |
| PLP had no sort dropdown despite API supporting `sort` param                           | UX gap       |
| Assistant pre-filled with a specific example query                                     | Confusing UX |
| Cart qty only via `onBlur` on number input — no +/− buttons                            | UX gap       |
| Admin sidebar had no active-link highlight                                             | UX gap       |
| Admin `globals.css` missing `.sr-only`, `.badge`, `.empty-state`, `.alert`, `.cta-row` | Style gap    |
| Admin catalog page had no loading/empty state or pagination                            | UX gap       |

---

## 2. What Was Improved in This Pass

### 2.1 Global Navigation (`apps/web/components/SiteHeader.tsx`)

- Added `isActive()` helper to compute current route
- Added `aria-current="page"` on every nav link
- Fixed `aria-current` styles: active links now render in accent color with 600 weight
- Fixed `.linkish` class — was in HTML but not in CSS; added the CSS rule
- Cart badge no longer has a leading space character
- Nav links show active style aligned to ADR-0009 CSS Custom Properties

### 2.2 ProductCard (`apps/web/components/ProductCard.tsx`)

- Added `AddToCartButton` (compact mode) directly on each card
- Better two-line structure: header/body/footer sections
- `product-card-desc` line-clamp at 2 lines to keep cards uniform height
- "View" button replaces the longer "View product" to save space for ATC
- `tabIndex={-1}` on thumb link (decorative) to avoid double keyboard stop

### 2.3 AddToCartButton (`apps/web/components/AddToCartButton.tsx`)

- Added `compact` prop — renders a single "Add" button for card grids
- Added explicit `−` / `+` stepper buttons around the quantity input
- Success message auto-clears after 2.5 s
- ARIA labels on all stepper buttons

### 2.4 Product Listing Page (`apps/web/app/products/page.tsx`)

- Added sort `<select>` with 4 options (Relevance, Price low-high, Price high-low, Name A–Z)
- Sort value passed as `?sort=` param to `sdk.listProducts()`
- Active filter summary shows current query and "Clear filters" link
- `pageLink()` helper preserves both `q` and `sort` across pages
- Empty state includes both "Clear filters" and "Ask AI assistant" CTAs
- Total count displayed in subtitle

### 2.5 AI Assistant (`apps/web/app/assistant/page.tsx`)

- Removed pre-filled default message (was confusing — looked like a bug)
- Added `SUGGESTED_PROMPTS` array of 4 common queries
- Suggestion pills shown when conversation is at welcome-only state
- Textarea now has a `placeholder` instead of a pre-filled value
- Clicking a suggestion pill fills the textarea (doesn't auto-submit — lets user review)

### 2.6 Cart (`apps/web/app/cart/page.tsx`)

- Added `−` / `+` stepper buttons on each cart line for quantity control
- Both inline increment/decrement and direct number input still work
- Remove button made smaller and visually secondary

### 2.7 Admin Sidebar (`apps/admin/components/AdminShell.tsx`)

- `isActive()` helper added for admin routes
- `aria-current="page"` on all sidebar links
- Admin `globals.css` now styles `[aria-current="page"]` with accent background

### 2.8 Admin CSS (`apps/admin/app/globals.css`)

Added previously missing utility classes:

- `.sr-only` — screen-reader only text
- `.badge` — inline status/count pill
- `.price` — bold letter-spaced price text
- `.empty-state` — dashed border empty panel
- `.cta-row` — flex row of action buttons
- `.alert`, `.alert-success`, `.alert-warning` — contextual alert panels
- Sidebar nav active state (`.sidebar nav a[aria-current="page"]`)
- Sidebar link hover now shows accent tint

### 2.9 Admin Catalog (`apps/admin/app/catalog/page.tsx`)

- Full rewrite with loading skeletons (animated placeholder rows)
- Empty state with "Create first product" CTA
- Client-side pagination (Previous / Next with page state)
- Search input with clear button
- `<code>` tag on slug column for readability
- `<span class="badge">` on status column

### 2.10 Web `globals.css`

New CSS added:

- `.product-card-body` / `.product-card-footer` / `.product-card-actions` — structured card layout
- `.product-card-desc` — 2-line clamp
- `.qty-btn` — explicit +/− stepper button style
- `.plp-filters` + `.plp-sort-select` — filter row and sort dropdown styles
- `.chat-suggestions` / `.suggestions-row` / `.suggestion-pill` — assistant suggested prompts
- Nav active link: `.nav a[aria-current="page"]` shows accent colour + weight 600

---

## 3. Routes That Work

### Storefront (`http://localhost:3001`)

| Route              | Status | Description                                                |
| ------------------ | ------ | ---------------------------------------------------------- |
| `/`                | ✅     | Hero + featured products (RSC) + trust grid                |
| `/products`        | ✅     | Product grid + search + sort + pagination                  |
| `/products/[slug]` | ✅     | PDP with gallery, price, ATC, related products             |
| `/search`          | ✅     | Search results with AI fallback CTA                        |
| `/cart`            | ✅     | Cart with qty stepper, remove, subtotal, checkout CTA      |
| `/checkout`        | ✅     | 3-step: Cart review → M-Pesa → Confirm                     |
| `/orders`          | ✅     | Order history table (auth-gated)                           |
| `/orders/[id]`     | ✅     | M-Pesa status, pending timer, retry                        |
| `/assistant`       | ✅     | AI chat with suggestion pills, product cards, 503 fallback |
| `/login`           | ✅     | Email/password, `router.refresh()` after auth              |
| `/register`        | ✅     | Registration + auto-login                                  |
| `loading.tsx`      | ✅     | Route-level skeleton for all routes                        |
| `error.tsx`        | ✅     | Error boundary with retry                                  |
| `not-found.tsx`    | ✅     | 404 with navigation CTAs                                   |

### Admin (`http://localhost:3002`)

| Route           | Status | Description                                                |
| --------------- | ------ | ---------------------------------------------------------- |
| `/`             | ✅     | KPI dashboard: products, inventory, API ping, MFA          |
| `/catalog`      | ✅     | Product list with search, pagination, loading/empty states |
| `/catalog/new`  | ✅     | Create product form                                        |
| `/catalog/[id]` | ✅     | Edit product form                                          |
| `/inventory`    | ✅     | Inventory table (permission-gated)                         |
| `/orders`       | ✅     | Admin orders list                                          |
| `/orders/[id]`  | ✅     | Order detail                                               |
| `/promotions`   | ✅     | Promotions list                                            |
| `/login`        | ✅     | Admin auth with MFA redirect                               |

---

## 4. Backend API Connections

| API                               | Used by                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| `GET /v1/auth/me`                 | SiteHeader (session), AdminShell (admin auth)                        |
| `POST /v1/auth/logout`            | SiteHeader logout, AdminShell logout                                 |
| `GET /v1/cart`                    | SiteHeader (count), Cart page, Checkout page                         |
| `POST /v1/cart/items`             | AddToCartButton                                                      |
| `PATCH /v1/cart/items/:id`        | Cart page quantity update                                            |
| `DELETE /v1/cart/items/:id`       | Cart page remove                                                     |
| `GET /v1/catalog/products`        | Homepage (RSC), PLP (RSC), Assistant, Admin dashboard, Admin catalog |
| `GET /v1/catalog/products/:slug`  | PDP (RSC)                                                            |
| `GET /v1/catalog/products/search` | Search page (RSC), Assistant product hydration                       |
| `POST /v1/ai/chat`                | AI Assistant                                                         |
| `POST /v1/checkout`               | Checkout page                                                        |
| `GET /v1/orders`                  | Orders list                                                          |
| `GET /v1/orders/:id`              | Order detail                                                         |
| `GET /v1/admin/inventory`         | Admin dashboard, Inventory page                                      |
| `GET /v1/admin/ping`              | Admin dashboard                                                      |

---

## 5. AI Functionality Connected

- `sdk.chat(text)` — full LLM reply from AI service
- `sdk.searchProducts({ q, pageSize })` — catalog search run in parallel with AI call; results shown as product cards even when AI is unavailable (503)
- Tool state feedback displayed step-by-step: "Consulting tools" → "Hydrating catalog" → "Waiting for reply"
- Graceful 503 fallback: shows AI unavailable banner + catalog cards
- 401 handling: prompts sign-in
- AI never invents prices — all product prices come from `firstOfferPrice()` using SDK data
- Suggested conversation starters replace empty input

---

## 6. Remaining Externally Blocked Items

| Item                         | Blocker                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| Real product images          | No image upload API or CDN connected; gallery shows gradient placeholder |
| Streaming AI responses       | `sdk.chat()` returns full response; streaming SSE not exposed on client  |
| MFA TOTP input on login      | Backend requires TOTP for admin; frontend login form has no TOTP step    |
| Guest checkout               | API requires authenticated session                                       |
| Category navigation          | No `/v1/catalog/categories` endpoint exposed                             |
| Variant selection on PDP     | Offers listed but no UI to select a specific variant                     |
| Stock availability indicator | API doesn't return stock count in product summary                        |
| Product specifications table | API `attributes` field not populated in seed data                        |
| Password visibility toggle   | Not blocked by backend — frontend enhancement                            |

---

## 7. Verification Results

### TypeScript

```
pnpm --filter=@buying-bot/web exec tsc --noEmit   → exit 0
pnpm --filter=@buying-bot/admin exec tsc --noEmit  → exit 0
```

### ESLint

All changed files pass ESLint:

- `apps/web/components/ProductCard.tsx` ✅
- `apps/web/components/AddToCartButton.tsx` ✅
- `apps/web/components/SiteHeader.tsx` ✅
- `apps/web/app/products/page.tsx` ✅
- `apps/web/app/assistant/page.tsx` ✅
- `apps/web/app/cart/page.tsx` ✅
- `apps/admin/app/catalog/page.tsx` ✅ (fixed `FormEvent` → `SyntheticEvent` deprecation)
- `apps/admin/components/AdminShell.tsx` ✅

---

## 8. Demo URLs

Start all services with `pnpm run dev` (Docker must be running for Postgres + Redis).

| URL                                   | Description                                       |
| ------------------------------------- | ------------------------------------------------- |
| http://localhost:3001                 | Storefront homepage with hero + featured products |
| http://localhost:3001/products        | Product listing with sort and search              |
| http://localhost:3001/products/{slug} | Product detail — Add to Cart, Buy Now, Ask AI     |
| http://localhost:3001/assistant       | AI shopping assistant with suggestion pills       |
| http://localhost:3001/cart            | Cart with +/− quantity controls                   |
| http://localhost:3001/checkout        | 3-step checkout: review → M-Pesa → confirm        |
| http://localhost:3001/search?q=laptop | Search results                                    |
| http://localhost:3001/orders          | Order history (login required)                    |
| http://localhost:3002                 | Admin dashboard with live KPI cards               |
| http://localhost:3002/catalog         | Product management with pagination                |
| http://localhost:3002/inventory       | Inventory table (permission-gated)                |

---

## 9. Accessibility Verification

- All form fields have visible labels or `.sr-only` labels
- `aria-current="page"` applied to active nav links in both apps
- `aria-live="polite"` on chat thread for screen-reader announcements
- `role="alert"` on all error messages
- `aria-label` on quantity stepper buttons (`Increase quantity`, `Decrease quantity`)
- Skip link (`#main`) present on all storefront pages
- Focus-visible outlines defined in accent color on all interactive elements
- `aria-hidden` on decorative product thumb links

---

## 10. Performance Observations

- Homepage, PLP, PDP, and Search are React Server Components — no JS shipped for catalog rendering
- `SiteHeader`, Cart, Checkout, Orders, and Assistant are client islands (justified by interactivity)
- `AddToCartButton` is client-only (mutation)
- `next/font/google` used for DM Sans + Syne — fonts preloaded and swap-safe
- No `<Image>` component used yet (no real images); gradient placeholders are CSS-only
- No unnecessary client-side waterfalls on product pages

---

_Report generated post-implementation of all P0 and P1 improvements identified in the audit._
