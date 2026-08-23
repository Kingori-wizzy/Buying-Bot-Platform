# Forensic System Audit — Buying Bot Platform

**Audit date:** 2026-08-23  
**Method:** Code + Prisma schema + migrations + CI config + security gate + attempted runtime probes  
**Rule:** Implementation wins over documentation. Documents are secondary.

**Classification (evidence-based):** **NOT PRODUCTION READY**

> This is not a polish finding. The current business payment model is **escrow**. There is **zero escrow implementation** in `apps/`. Checkout UX and payment code are still **M-Pesa sandbox simulation**. Object storage for product images is **not implemented** (URL metadata only). At audit time, local **PostgreSQL (5433) and Redis (6379) were unreachable** and **Docker Desktop was not running**, so the full live admin→customer journey could not be re-executed in this session.

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| Does a modular commerce monorepo exist? | **Yes** — apps + packages + Prisma schemas |
| Can admin manage catalog in code? | **Yes (API + partial UI)** — create/edit/publish/import → PostgreSQL |
| Is catalog independent of marketplaces? | **Yes for CX** — sources default **disabled**; public `provenance: null` |
| Are storefront prices/stock DB-backed? | **Yes in code** — Offer + InventoryBalance |
| Are product images production-ready? | **No** — HTTPS URL + opaque `objectKey`; no binary object storage |
| Does AI invent prices if tools work? | **Designed not to** — tools call CatalogService; default model is **deterministic** |
| Cart / checkout / reservation? | **Implemented in code** (PostgreSQL) |
| Escrow? | **MISSING** |
| Live M-Pesa? | **Not implemented** — adapter simulates STK; no Daraja HTTP |
| Notifications delivery? | **Mock / console / stub** |
| Ready for a real paying customer today? | **No** |

### Audit environment (this session)

| Dependency | Status |
|------------|--------|
| Apps API/Web/Worker/AI/Admin ports 3000–3004 | **DOWN** at audit start |
| PostgreSQL `127.0.0.1:5433` | **Connection refused** |
| Redis `127.0.0.1:6379` | **Connection refused** |
| Docker Desktop | **Not running** (`dockerDesktopLinuxEngine` pipe missing) |
| `pnpm run security:gate` | **PASS** |
| `pnpm run integrity` | **FAIL** (DB unreachable) |
| `prisma migrate status` | **FAIL** (DB unreachable) |

Prior sessions (2026-08-20) had green migrate/integrity/typecheck/lint/test/build when infra was up. That historical evidence is noted but **not treated as current runtime proof**.

---

## 2. Actual Architecture (from repo)

```
apps/web          → Next.js storefront (:3001)
apps/admin        → Next.js admin (:3004)
apps/api          → NestJS/Fastify API (:3000)
apps/worker       → Outbox/jobs (:3002)
apps/ai-service   → Model/tool orchestration (:3003)
apps/docs         → Docs site (placeholder bootstrap)

packages/*        → database, sdk, auth, config, ai-core, product-sources, ui, …

PostgreSQL (multi-schema) = system of record
Redis = rate limit / cache (fail-open to in-memory for auth limiter)
Object storage = NOT wired for binary media
```

**No** `apps/mobile` (ARCHITECTURE.md lists it as future — accurate as future).

---

## 3. Actual Repository Structure

### Apps
| App | Role | Evidence |
|-----|------|----------|
| `apps/api` | Domain HTTP API | Controllers under `apps/api/src/**` |
| `apps/web` | Customer UI | `apps/web/app/**/page.tsx` |
| `apps/admin` | Admin UI | `apps/admin/app/**/page.tsx` |
| `apps/worker` | Async jobs | `apps/worker/src/app.ts` |
| `apps/ai-service` | LLM + tools client | `apps/ai-service/src/app.ts` |
| `apps/docs` | Docs app | Placeholder only |

### Packages (13)
`ai-core`, `auth`, `config`, `database`, `eslint-config`, `prettier-config`, `product-sources`, `sdk`, `types`, `typescript-config`, `ui`, `utils`, `validation`

### Migrations (7)
1. `20260813120000_identity_foundation`
2. `20260813160000_commerce_m6_m12`
3. `20260813180000_m15_m22_ai_notifications`
4. `20260820120000_product_source_provenance`
5. `20260820140000_real_market_catalog_extensions`
6. `20260820160000_sync_run_checkpoints`
7. `20260820180000_admin_managed_catalog`

---

## 4. Frontend Status (`apps/web`)

### Routes that exist
| Route | Purpose |
|-------|---------|
| `/` | Home / search entry |
| `/products`, `/products/[slug]` | Listing + PDP |
| `/search` | Search |
| `/compare` | Compare |
| `/assistant` | AI chat |
| `/login`, `/register` | Auth |
| `/cart` | Cart |
| `/checkout` | Checkout (**M-Pesa MSISDN UX**) |
| `/orders`, `/orders/[id]` | Order history / detail (**M-Pesa wait UX**) |

### Data flow (code)
UI → `@buying-bot/sdk` / `fetch` → `/v1/*` → Prisma.

No storefront hardcoding of product catalogs found as primary path; cards use API products. Demo/import badges exist for `contentOrigin`.

### Gaps / honesty
| Item | Status |
|------|--------|
| Payment UX | Still **M-Pesa** copy and flow — **conflicts with escrow business requirement** |
| Layout marketing | Still mentions “pay with M-Pesa” (`apps/web/app/layout.tsx`) |
| Account profile depth | Minimal (auth + orders) |
| Live verification this session | **Not possible** (API/DB down) |

---

## 5. Admin Status (`apps/admin`)

### Pages that exist
Dashboard, Login, Catalog list/new/detail, Imports, Inventory, Orders list/detail, Promotions.

### Capabilities vs requirement (ADMIN MANAGES CATALOG)

| Capability | API | Admin UI | Verdict |
|------------|-----|----------|---------|
| Create product | Yes | Yes | **WORKS (code)** |
| Edit product | Yes | Yes | **WORKS (code)** |
| Publish / unpublish (status) | Publish endpoint + status patch | Publish button + status | **WORKS (code)** |
| Archive | Via status enum | Partial (status select) | **PARTIAL** |
| Set price / currency | Offer create/update | Price fields on editor | **WORKS (code)** |
| Set stock | Inventory adjust API | Inventory page | **WORKS (code)** |
| Upload image binary | No multipart storage | HTTPS URL only | **MISSING / PARTIAL** |
| Gallery reorder / primary | Limited media create | URL append | **PARTIAL** |
| Variants editor | Default variant on create | Shows first variant only | **MISSING** |
| Brands / categories UI | APIs exist | No dedicated pages | **MISSING UI** |
| Customers | — | No page | **MISSING** |
| Audit logs UI | securityEvent writes exist | No page | **MISSING** |
| Media library | — | No page | **MISSING** |

---

## 6. Backend / API Status

### Auth
| Area | Status |
|------|--------|
| Register / login / logout / CSRF / me | Implemented |
| Admin MFA (TOTP) | Implemented |
| RBAC guards | Implemented |
| Service JWT | Implemented |

### Catalog (public)
`GET /v1/products`, `/:idOrSlug`, related, categories, brands, `GET /v1/search/products`, compare, price-history, availability.

### Catalog (admin)
CRUD products, publish, brands, categories, offers, media metadata, CSV imports.

### Cart / checkout / orders
Cart CRUD + merge; checkout; orders me/get/cancel; admin orders list/get.

### Payments
`POST /v1/webhooks/payments/mpesa` only. **No escrow webhook routes.**

### AI
`POST /v1/ai/chat`, `chat/stream`, `retrieve`, tools under `/v1/ai/tools/:toolName`.

### Product sources (deferred)
Admin list/patch/sync — defaults **disabled**.

### Known stub / mock behaviors
| Component | Behavior |
|-----------|----------|
| `MpesaAdapter.initiate` | **Simulates** STK; production branch still does not call Daraja HTTP |
| `MpesaAdapter.query` | Always `pending` |
| Worker `payment-initiate` | Uses sandbox initiate path |
| Notification providers | Recording email / console SMS / stub WhatsApp |
| AI default | `AI_PROVIDER=deterministic` |

---

## 7. Database Status

### Schemas in Prisma
`identity`, `catalog`, `inventory`, `promotions`, `cart`, `orders`, `payments`, `integrations`, `ai`, `notifications`, `audit` (via models).

### Core models present (schema.prisma)
Users, Orgs, Roles, Permissions, Sessions, MFA, Brands, Categories, Products (+ `contentOrigin`), Variants, Skus, Offers, PriceWindows, MediaAssets, ProductMedia, VariantMedia, ProductSearchDocument, CatalogImport/Row, Locations, InventoryBalance/Movement, Reservations, Promotions/Coupons, Carts/Lines, Orders/Items/FinancialSnapshot, Outbox, Payments/Attempts/Transactions, WebhookReceipt, ProductSource*, Knowledge*, Conversations, ToolExecution, Notification*, ApiKey.

### Explicitly **absent** from schema
| Expected by some docs/business | Present? |
|--------------------------------|----------|
| Escrow entities / holds | **NO** |
| Refunds table | **NO** |
| Shipments / fulfillment entities | **NO** (order status enum only) |

### Runtime DB proof this session
**Unavailable** — Postgres refused connections. Schema/migrations exist in repo; live table presence not re-confirmed today.

---

## 8–9. Authentication & Authorization Status

| Item | Status |
|------|--------|
| Session cookies + CSRF | Code present |
| Separate admin realm + MFA | Code present |
| Permission checks on admin catalog | Code present (`catalog` create/update) |
| IDOR on orders | Intended subject scoping in controllers — **needs live retest** |
| Secrets in frontend | Security gate asserts frontends do not read server secrets via `process.env` |

---

## 10. Product Catalog Status

| Question | Finding |
|----------|---------|
| Primary model now | **Admin-managed** (API + contentOrigin ADMIN/DEMO/IMPORT) |
| Marketplace required for CX? | **No** — sources disabled; provenance null on public APIs |
| Marketplace code retained? | **Yes** — `packages/product-sources` + integrations tables (**DEFERRED**) |
| Mixed risk | Sandbox fixtures / demo seeds can still exist in DB if previously seeded |

---

## 11. Product Image / Price Status

| Field | Source | Verdict |
|-------|--------|---------|
| Name / description | `Product` | **DB** |
| Price | `Offer.listPriceMinor` + pricing engine | **DB / server** |
| Stock | `InventoryBalance` | **DB** |
| Image URL | `MediaAsset.externalUrl` | **DB metadata**; **not** platform-hosted bytes |
| Specs | Attributes models exist | **PARTIAL** (admin UX thin) |

Admin editor explicitly: “Add image URL (HTTPS)” with synthetic `objectKey` — **not** real upload pipeline.

---

## 12. Search Status

| Item | Evidence |
|------|----------|
| Implementation | `CatalogService.searchProducts` — PostgreSQL FTS (`document_tsv` / `plainto_tsquery`) **OR** `ILIKE` |
| Indexes | Created in commerce migration |
| Unpublished | Public listing filters ACTIVE (code path) |
| Live query proof this session | **Not run** (API/DB down) |

---

## 13. AI / RAG Status

```
Customer → web/assistant → API /v1/ai/chat → ai-service → provider
                ↓
         tools → API /v1/ai/tools/* → CatalogService / cart / inventory
```

| Item | Status |
|------|--------|
| Tool grounding for products | **Implemented** |
| Default provider | **Deterministic** (local/CI) |
| Vendor LLM | Env-gated (`openai`/`anthropic`/…); keys server-side only |
| RAG | Knowledge ingest/retrieve + embeddings models exist; quality depends on ingested docs + provider |
| Streaming | Proxy SSE implemented |
| Invented prices | Guardrails/prompts forbid; tools required — **must still be E2E tested with real catalog** |

---

## 14–15. Cart & Checkout Status

| Step | Code status |
|------|-------------|
| Add/update/remove cart lines | **Implemented** (PostgreSQL) |
| Server-side unit price | **Implemented** via pricing |
| Checkout calculation | **Implemented** (tax/promo engine) |
| Inventory reservation | **Implemented** before order commit |
| Idempotency records | Model + checkout usage |
| Live journey this session | **Not verified** |

---

## 16. Payment Status

| Claim | Reality |
|-------|---------|
| PaymentProvider port | **Exists** |
| Implementations | **Only `MpesaAdapter`** |
| Daraja STK HTTP | **Not implemented** (comment only) |
| Webhook apply path | **Exists** + unit tests |
| `PAYMENTS_ENABLED` | Config validation; **not** a hard runtime kill-switch in checkout create path |
| Customer UX | M-Pesa MSISDN + “await M-Pesa” |

**Verdict:** Sandbox / simulation payment rail. **Not live money.**

---

## 17. Escrow Status

| Item | Status |
|------|--------|
| Escrow adapter | **MISSING** |
| Escrow env vars used in code | **MISSING** (docs may mention future) |
| Escrow webhooks | **MISSING** |
| Order states for escrow hold/release | **MISSING** |
| Business requirement alignment | **FAILED** — company wants escrow; platform still M-Pesa-shaped |

**EXTERNAL PREREQUISITE:** provider choice, API docs, sandbox/prod credentials, webhook spec, settlement/dispute rules — then implement against `PaymentProvider` (or extend port intentionally).

---

## 18. Order Status

| Item | Status |
|------|--------|
| Customer order create via checkout | **Code yes** |
| Customer order list/detail | **Code + UI** |
| Admin order list/detail | **Code + UI** |
| Fulfillment workflow UI | **MISSING** (no shipment module) |
| Status transitions beyond payment | **PARTIAL** (enum exists; rich ops UI thin) |

---

## 19. Inventory Status

| Item | Status |
|------|--------|
| On-hand / reserved | PostgreSQL balances |
| Adjust API | Admin |
| Reserve on checkout | Yes |
| Concurrency tests | `inventory.concurrency.test.ts` exists |
| Live oversell proof this session | **Not run** |

---

## 20. Notification Status

| Channel | Classification |
|---------|----------------|
| Email | **MOCK** (`RecordingEmailProvider` / worker console) |
| SMS | **MOCK** (`ConsoleSmsProvider`) |
| WhatsApp | **NOT CONFIGURED** (`StubWhatsAppProvider` rejects) |
| Intent persistence | **REAL** (DB) |

---

## 21. Security Status

| Check | Result |
|-------|--------|
| `pnpm run security:gate` (this session) | **PASS** |
| CSRF / Helmet / MFA / RBAC | Present in code |
| Upload validation helper | Exists; **full binary upload path incomplete** |
| Pen-test / WAF / Vault | **EXTERNAL / not evidenced** |
| Secrets in git | Gate checks examples |

---

## 22. Testing Status

### Automated tests found (~36 unit/integration + 5 E2E specs)
Notable: auth integration, cart merge, inventory concurrency, payments webhook, catalog CSV, AI guardrails, financial engine, product-sources, admin/web sdk smoke tests.

### E2E specs
- `e2e/smoke.spec.ts`
- `e2e/customer-purchase-flow.spec.ts` (M-Pesa webhook simulation)
- `e2e/browser-checkout-sandbox.spec.ts`
- `e2e/admin-catalog-journey.spec.ts`
- `e2e/sandbox-marketplace-journey.spec.ts` (**marketplace-era**; may mislead vs current admin catalog CX)

### Honesty
| Gap | Note |
|-----|------|
| This audit did not re-run `pnpm test` | Infra down |
| E2E not executed this session | Requires running stack + credentials |
| Passing unit tests ≠ full customer journey | Especially payment/escrow |

---

## 23. CI/CD Status

| Item | Evidence |
|------|----------|
| `.github/workflows/ci.yml` | Lint/typecheck/build/test/audit; Postgres+Redis services; `PAYMENTS_ENABLED=false`; `AI_PROVIDER=deterministic` |
| `staging-deploy.yml` | Present |
| Live deploy proof | **Not verified here** |

---

## 24. Infrastructure Status

| Item | Status |
|------|--------|
| Compose (`infrastructure/docker/compose`) | Defined (postgres:5433, redis, api, worker, …) |
| This machine | **Docker Desktop not running** |
| Local apps | Were previously runnable via `node dist` + `next dev` when infra up |
| Classification | **LOCAL ONLY** for current host state; staging/production hosts **EXTERNAL** |

---

## 25. Observability Status

| Item | Status |
|------|--------|
| `/health/live`, `/ready`, `/health` | Implemented |
| `/metrics` | Implemented |
| Alerting stack | **EXTERNAL / not proven** |

---

## 26. Documentation Accuracy Audit

| Document claim | Actual code | Conclusion |
|----------------|-------------|------------|
| Many reports: “CONDITIONALLY PRODUCTION READY” | Escrow missing; M-Pesa simulated; media URL-only; infra often external | **Overstates readiness for live commerce under escrow requirement** |
| `docs/EAD/README.md` | Folder is a placeholder (“Documents will be added later”) | **EAD not authored** |
| `docs/ARCHITECTURE.md` “source of truth for architecture” | Useful topology; also lists future mobile; payment narrative may lag escrow decision | **Secondary**; code wins |
| `ADMIN_MANAGED_CATALOG_*` | Matches direction: admin catalog, marketplace deferred, escrow external | **Mostly aligned** with code intent |
| `REAL_MARKET_*` reports | Marketplace ingestion as CX | **Superseded** by admin-managed decision / disabled sources |
| Frontend still “pay with M-Pesa” | True in UI | **Docs + UI lag business escrow decision** |

---

## 27. EAD Discrepancies

| DOCUMENT SAYS | ACTUAL CODE SAYS | EVIDENCE | CONCLUSION |
|---------------|------------------|----------|----------|
| EAD set exists under `docs/EAD` | Only README placeholder | `docs/EAD/README.md` | **No formal EAD body to reconcile** |
| ARCHITECTURE: omnichannel + M-Pesa-centric history | PaymentProvider = M-Pesa only; escrow absent | `mpesa.adapter.ts`, no escrow symbols in `apps/` | **Architecture docs incomplete vs new escrow requirement** |
| Mobile app capability home | No `apps/mobile` | Repo tree | **Future / not implemented** |

---

## 28. Technical Debt

1. Payment UX and adapters still M-Pesa while business wants escrow  
2. Simulated STK that can look “successful” without money movement  
3. Media `objectKey` without storage backend  
4. Thin variant / brand / category / customer / audit admin UX  
5. Deferred marketplace packages still in tree (OK if clearly deferred; E2E sandbox-marketplace can confuse)  
6. `PAYMENTS_ENABLED` not consistently gating checkout initiate  
7. Notification providers non-delivery  
8. Docs sprawl with conflicting readiness claims  

---

## 29. External Dependencies

| Dependency | Needed for |
|------------|------------|
| PostgreSQL + Redis (or managed equivalents) | Any real runtime |
| Object storage + CDN | Production images |
| Escrow provider package (docs + keys + webhooks) | Payment under current business model |
| Optional: LLM vendor keys | Non-deterministic AI |
| Email/SMS vendors | Real notifications |
| DNS/TLS/hosting | Staging/production |
| Docker Desktop (local) | Local compose |

---

## 30. Production Blockers

| Class | Blocker |
|-------|---------|
| **BUSINESS / PAYMENT** | Escrow required; **not implemented**; UX still M-Pesa |
| **CODE** | No escrow adapter/webhooks/states |
| **CODE** | M-Pesa adapter does not call Daraja (even if M-Pesa were desired) |
| **FRONTEND** | Checkout/orders copy and flow are M-Pesa-specific |
| **DATABASE** | No escrow/refund/shipment models |
| **MEDIA** | No binary object storage pipeline |
| **NOTIFICATION** | No real delivery adapters |
| **INFRASTRUCTURE** | Host/TLS/secrets EXTERNAL; this host had DB/Redis/Docker down |
| **TESTING** | No current-session live E2E proof; escrow E2E impossible |
| **SECURITY** | Pen-test / WAF / secret manager EXTERNAL |
| **LEGAL** | Counsel/compliance EXTERNAL |

---

## 31. Recommended Fix Order

### P0 (must before any real customer money)
1. **Business decision lock:** escrow provider selection + docs + sandbox credentials  
2. Implement escrow against payment port (or evolve port intentionally) + webhooks + order/payment states  
3. Replace M-Pesa-first checkout/order UX with escrow-accurate UX (or dual-rail if intentional)  
4. Bring up and keep Postgres/Redis; prove migrate + integrity green  
5. End-to-end: admin create → publish → storefront → cart → checkout → **escrow sandbox** → admin order view  

### P1
6. Real media upload (presign + object storage + serve URL)  
7. Gate payment initiation on explicit config; fail closed without credentials  
8. Admin variants / brands / categories UX sufficient for ops  
9. Notification adapter for transactional email at minimum  
10. Retire or quarantine misleading marketplace E2E as non-CX  

### P2
11. Fulfillment/shipping domain if ops requires it  
12. Refunds  
13. Observability alerting  
14. Load testing (k6) on staging  

### P3
15. Future marketplace re-enable behind feature flags  
16. Mobile app  
17. Advanced RAG corpus ops  

---

# Final answers (exact)

### 1. What works today (in code, when infra is up)
- Monorepo apps/packages, Prisma multi-schema catalog/commerce/identity  
- Auth (customer + admin MFA), CSRF, RBAC patterns  
- Admin catalog create/edit/publish/import APIs writing PostgreSQL  
- Public catalog/search/compare/availability grounded in DB  
- Cart + checkout calculation + inventory reservation paths  
- AI proxy + catalog tools + deterministic provider for local/CI  
- Outbox/worker patterns (import, payment initiate simulation, notifications console)  
- CI workflow definition; security:gate static checks  

### 2. What does not work
- **Escrow (entirely)**  
- Live money collection  
- Real M-Pesa Daraja STK  
- Platform-hosted image binaries  
- Real email/SMS/WhatsApp delivery  
- Rich fulfillment ops  
- Formal EAD document body  
- **This session’s live stack** (Postgres/Redis/Docker/apps down)  

### 3. What is mocked / sandbox
- M-Pesa initiate/query simulation  
- Worker sandbox payment initiate  
- Deterministic AI provider (default)  
- Recording/console notification providers  
- Product-source mock/csv/Jumia shells (**disabled**)  
- Webhook “PAID” via simulated M-Pesa payloads in scripts/E2E  

### 4. What is missing
- Escrow adapter, webhooks, DB states, UX  
- Object storage upload pipeline  
- Refunds / shipments  
- Admin customers, brands UI, media library, audit UI, multi-variant editor  
- Production observability alerting  

### 5. What requires company credentials
- Escrow API key/secret/base URL/webhook secret (provider-specific)  
- Optional LLM vendor keys  
- Object storage credentials  
- Email/SMS vendor credentials  
- Hosting DNS/TLS secrets  
- (If ever used) M-Pesa Daraja keys — **not current business focus**  

### 6. What requires business decisions
- Escrow provider choice and settlement/dispute rules  
- Whether M-Pesa remains a secondary rail or is removed from UX  
- Image hosting strategy (CDN/bucket)  
- What “order processing” means operationally (fulfillment SLA)  

### 7. What the team must implement next
1. Escrow integration plan + PaymentProvider (or extended) adapter  
2. Checkout/order UI rewrite away from M-Pesa-only  
3. Media binary pipeline  
4. Restore local/staging infra reliability  
5. Admin catalog UX gaps needed for daily merchandising  

### 8. What must be tested before production
- Admin create → publish → search → PDP image/price/stock  
- AI tool-grounded answers on real admin products  
- Cart → checkout → **escrow sandbox** success + failure + webhook replay  
- Inventory reservation / release / cancel  
- AuthZ IDOR on orders and admin mutations  
- Upload malware/type/size rejection  
- Restore/backup drill on target environment  

### 9. Ready for a real customer?
**No.** Not for live payment under the escrow requirement; not while media and notifications are incomplete; not while this environment cannot even reach Postgres.

### 10. Prioritized action list
See **§31 P0–P3**.

---

## FINAL CLASSIFICATION

# NOT PRODUCTION READY

**Reason (primary):** Current business payment requirement is escrow; escrow is **not implemented**. Existing payment path is **M-Pesa simulation** with M-Pesa UX. Additional blockers: no binary media storage, mock notifications, and **no live runtime verification** in this audit (DB/Redis/Docker down).

Do not interpret older “CONDITIONALLY PRODUCTION READY” reports as current truth under the escrow business model.
