# Demo Guide — Buying Bot Platform

**Version:** 0.1.0-rc.2  
**Git SHA:** `3b5bb6635ce62e01e056cfd4c7b61d448380e5e7`  
**Classification:** DEMO READY (local/staging with known limitations)

---

## Prerequisites

| Requirement | Version / Notes |
|-------------|-----------------|
| Node.js | 22.x (`nvm use 22`) |
| pnpm | 9.15.9 (Corepack) |
| Docker Desktop | For Postgres + Redis |
| `.env` | Copy from `.env.example` — **never commit** |

---

## 1. Start Infrastructure

```powershell
cd "C:\Buying Bot Platform"
docker compose -f infrastructure/docker/compose/docker-compose.yml up -d postgres redis
```

Verify:

```powershell
docker compose -f infrastructure/docker/compose/docker-compose.yml ps
```

Expected: `postgres` and `redis` healthy. Postgres on host port **5433**, Redis on **6379**.

---

## 2. Migrate Database

```powershell
$env:DATABASE_URL = "postgresql://buyingbot:buyingbot@127.0.0.1:5433/buyingbot?schema=public"
pnpm migrate:deploy
```

Optional staging sample product (safe, non-production):

```powershell
pnpm --filter @buying-bot/database exec node dist/seed-staging-cli.js
```

(Slug: `staging-smoke-sample`, KES 199.00, qty 100)

---

## 3. Build Backend Services

```powershell
pnpm run build --filter=@buying-bot/api --filter=@buying-bot/worker --filter=@buying-bot/ai-service
```

---

## 4. Start All Services

**Recommended (Windows):**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev\start-local.ps1
```

This script:

- Loads `.env` via `node --env-file=.env`
- Starts API on **3000**, worker on **3002**, AI on **3003**
- Starts storefront on **3001**, admin on **3004**

Wait ~30 seconds for Next.js to compile.

**Manual alternative:**

```powershell
node --env-file=.env apps/api/dist/index.js
$env:PORT='3002'; $env:SERVICE_NAME='worker'; node --env-file=.env apps/worker/dist/index.js
$env:PORT='3003'; $env:SERVICE_NAME='ai-service'; node --env-file=.env apps/ai-service/dist/index.js
pnpm --filter=@buying-bot/web dev
pnpm --filter=@buying-bot/admin dev
```

> **Important:** Do not run `node apps/api/dist/index.js` without `--env-file=.env` — the API will start without database configuration.

---

## 5. Verify Health

```powershell
curl http://127.0.0.1:3000/health/ready
curl http://127.0.0.1:3002/health/live
curl http://127.0.0.1:3003/health/live
```

Automated smoke:

```powershell
$env:API_BASE_URL = "http://127.0.0.1:3000"
$env:SMOKE_REQUIRE = "1"
node ./scripts/smoke/staging-smoke.mjs
```

Customer journey:

```powershell
$env:API_BASE_URL = "http://127.0.0.1:3000"
node ./scripts/dev/journey-validation.mjs
```

---

## URLs

| Surface | URL |
|---------|-----|
| Storefront homepage | http://localhost:3001 |
| Product catalog | http://localhost:3001/products |
| Search | http://localhost:3001/search |
| AI assistant | http://localhost:3001/assistant |
| Cart | http://localhost:3001/cart |
| Checkout | http://localhost:3001/checkout |
| Register | http://localhost:3001/register |
| Login | http://localhost:3001/login |
| Orders | http://localhost:3001/orders |
| Admin dashboard | http://localhost:3004 |
| Admin catalog | http://localhost:3004/catalog |
| Admin inventory | http://localhost:3004/inventory |
| API health | http://localhost:3000/health/ready |
| API metrics | http://localhost:3000/metrics |

---

## Test Accounts

**No pre-seeded demo accounts exist.** Create accounts at runtime:

| Role | How to create |
|------|---------------|
| Customer | Register at http://localhost:3001/register (any `@example.com` + password ≥8 chars) |
| Admin | Register via API, then assign `ADMIN` role in DB (integration test pattern) — **no UI self-service admin signup** |

Example customer registration via API (for scripts):

```
POST /v1/auth/register  { "email": "demo@example.com", "password": "DemoPass1!" }
POST /v1/auth/login     { "email": "demo@example.com", "password": "DemoPass1!", "realm": "customer" }
```

Admin requires MFA when configured — use admin login at http://localhost:3004/login.

---

## Demo Sequences

### DEMO 1 — Homepage → Search → Product → Cart

1. Open http://localhost:3001
2. Verify hero, featured products (from API), trust grid
3. Search "product" via header or `/search?q=product`
4. Click a product → PDP shows server-authoritative price
5. Click **Add to cart** → go to http://localhost:3001/cart
6. Verify line items, quantity controls, subtotal from API

**Expected:** All prices from API offers; cart badge updates in header.

---

### DEMO 2 — AI Assistant → Recommendation → Add to Cart

1. Open http://localhost:3001/assistant
2. Click a suggested prompt or type: *"I need a laptop under KES 100,000"*
3. Observe tool-state indicator while waiting
4. Assistant reply + product cards hydrated from catalog search API
5. Click **Add** on a product card

**Expected:** Product cards show API prices. If AI service down → graceful "AI unavailable" banner + catalog cards still shown.

**Requires:** AI service on :3003 started with `--env-file=.env` (shared `SERVICE_JWT_SECRET`).

---

### DEMO 3 — Cart → Checkout → M-Pesa (sandbox)

1. Add items to cart (logged in)
2. Go to http://localhost:3001/checkout
3. Step through: Cart review → Delivery & M-Pesa MSISDN → Confirm
4. Place order → redirected to `/orders/[id]`
5. Observe `PENDING_PAYMENT` status

**Expected:** `PAYMENTS_ENABLED=false` locally — order created but no live STK Push. Payment state remains pending until webhook/simulation.

**EXTERNAL:** Live M-Pesa sandbox credentials required for real STK Push.

---

### DEMO 4 — Order → Admin → Order Management

1. Complete DEMO 3 as customer
2. Log in to admin at http://localhost:3004 (admin account with `orders:read`)
3. Navigate to **Orders**
4. View order detail

**Expected:** Admin sees order from API. Unauthorized roles see hidden nav links; API still enforces AuthZ.

---

### DEMO 5 — Admin → Inventory → Product Management

1. Admin → **Products** (`/catalog`) — list, search, pagination
2. **Create product** (`/catalog/new`) if `catalog:create` permission
3. **Inventory** (`/inventory`) — SKU balances table

**Expected:** KPI dashboard shows live product count and inventory sample from API.

---

### DEMO 6 — AI → Product Search → Tool Execution

1. With AI service healthy, send assistant query mentioning a product category
2. API proxies to AI service with service JWT
3. AI service calls authorized `/v1/ai/tools/*` endpoints
4. Results returned — never invented prices

**Verify via API logs:** `AI service bootstrap complete`, `provider: deterministic`

---

### DEMO 7 — Failure → AI Unavailable → Graceful Fallback

1. Stop AI service (or misconfigure JWT)
2. Send assistant message
3. Frontend shows "AI unavailable" + catalog search results
4. Catalog, cart, checkout still work

**Expected:** HTTP 502/503 from API → user-friendly fallback, no stack trace.

---

### DEMO 8 — Security → Unauthorized Access Blocked

1. Customer session → attempt http://localhost:3004 (redirects to login)
2. Invalid CSRF token on mutation → 403
3. Customer cannot access another user's order (IDOR guard)
4. Inspect browser DevTools → no secrets in HTML/JS/localStorage

---

## Required Environment Variables (Local)

From `.env.example` — minimum for demo:

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://buyingbot:buyingbot@127.0.0.1:5433/buyingbot?schema=public` | Postgres |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Rate limiting |
| `SESSION_SECRET` | dev-only string | Session cookies |
| `SERVICE_JWT_SECRET` | dev-only string | API ↔ AI service auth |
| `CORS_ORIGIN` | `http://localhost:3001,http://localhost:3004` | Browser origins |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` | Storefront API |
| `AI_PROVIDER` | `deterministic` | Local AI without vendor keys |
| `AI_SERVICE_BASE_URL` | `http://127.0.0.1:3003` | API → AI proxy |
| `PAYMENTS_ENABLED` | `false` | Disable live payments locally |

---

## Known External Blockers

| Blocker | Impact on demo |
|---------|----------------|
| M-Pesa Daraja sandbox credentials | No live STK Push |
| OpenAI/Anthropic API keys | Use `AI_PROVIDER=deterministic` instead |
| Production DNS/TLS | Localhost only |
| Admin demo account seed | Must create + assign role manually |
| Category browse API | No category nav in UI |
| Product images / CDN | Gradient placeholders only |

---

*Demo guide for release candidate 0.1.0-rc.2.*
