# CURRENT SYSTEM REALITY REPORT

**Generated:** 2026-08-24 (codebase verification after P0/P1 gap-closure implementation)  
**Source of truth:** repository code, schema, tests, env contracts — not prior marketing docs.  
**Final classification:** **NOT PRODUCTION READY**

---

## 1. What actually works

| Area | Evidence |
|------|----------|
| Admin product CRUD / publish / status | `CatalogAdminController` + `CatalogService` + admin catalog UI |
| Brands & categories create/list | Admin API + `/catalog/taxonomy` + create-product selectors |
| CSV catalog import (admin) | Import endpoints + worker `catalog.import` |
| Public catalog list/search/detail | `GET /v1/products`, `/v1/search/products` — ACTIVE only |
| Cart + merge + server pricing | Cart service + merge test |
| Checkout idempotency + inventory reservation | Checkout service + outbox `payment.initiate` |
| Escrow payment **port** + adapter | `EscrowAdapter`, `PAYMENT_PROVIDER=escrow` default |
| Escrow webhook HMAC + idempotency | `handleEscrowWebhook` / `applyEscrowReceipt` + DB webhook tests |
| M-Pesa removed from customer UX | Checkout/order pages show Escrow only; M-Pesa webhook deferred |
| Local media object storage | `LocalFilesystemStorage`, `POST .../media/upload`, `GET /v1/media/files/products/:fileName` |
| Notifications port + safe processing | `NotificationsService` + intent/delivery tables (dev adapter) |
| Auth / RBAC / MFA admin gates | Session + permission guards on admin routes |
| AI tool grounding against catalog | AI tools call catalog/search APIs (provider keys still external) |
| Unit/integration tests green | `pnpm test` (API 41 tests including escrow webhooks) |
| Lint / typecheck / security gate / integrity | Verified green after this phase |

---

## 2. What is partial

| Area | Gap |
|------|-----|
| Escrow live HTTP | Generic `/v1/payments` shape — **must align** when real provider docs/credentials arrive |
| Media | Local FS works; **no production cloud adapter** wired (S3/GCS/Azure) |
| Multi-variant editor | Default variant + price/SKU on create/edit; rich multi-variant UX still thin |
| Product gallery UX | Upload + URL link; reorder/delete/primary polish incomplete |
| Admin order dashboard | Exists with list/detail; escrow-specific fields depend on payment rows |
| Customer order history | Present; cancellation/refund UX limited to what schema supports |
| AI experience | Grounded when provider configured; otherwise controlled unavailable |
| Frontend polish | Improved vs prototype in places; not a full redesign |
| E2E escrow settlement | Specs updated; **require matching `ESCROW_WEBHOOK_SECRET` in API env** |

---

## 3. What is mocked

| Item | Notes |
|------|-------|
| Escrow **test double** | Only when `NODE_ENV=test` or `ESCROW_ALLOW_TEST_DOUBLE=true` — creates pending refs, never live money |
| Notification delivery | Development/console-style adapters when SMTP/SMS/WhatsApp credentials absent |
| Marketplace product feeds | Isolated/disabled as primary catalog; not CX source of truth |
| Staging smoke product | Demo/seed catalog for local journeys — not production inventory |

---

## 4. What is disabled

| Item | Notes |
|------|-------|
| Customer M-Pesa UX | Removed from checkout/order UI |
| M-Pesa settlement path | Webhook accepts but **does not** mark orders paid (`deferred`) |
| `MPESA_ENABLED` | Defaults false; only if explicitly enabled + `PAYMENT_PROVIDER=mpesa` |
| Product-source auto-ingest as primary catalog | Deferred per business direction |

---

## 5. What is broken / incomplete vs full production journey

| Item | Notes |
|------|-------|
| Live escrow without credentials | Initiate → `FAILED` / `ESCROW_NOT_CONFIGURED` (safe, not “broken”) |
| Unsigned escrow webhooks | Rejected (correct) — local e2e fails until secret configured |
| Cloud object storage | Not configured — local only |
| Full Phase 17 browser E2E against live stack | Depends on running services + env secrets; not claimed PASS here |

---

## 6. What is missing

- Production Escrow provider contract confirmation (paths/payloads)
- Production object-storage credentials + adapter selection
- Production DB URL / pooling / TLS as company will supply
- Real EMAIL/SMS/WhatsApp provider credentials
- AI provider keys for production assistant
- Legal/ops go-live approvals (out of code scope)

---

## 7–9. External / vendor / business

| Dependency | Status |
|------------|--------|
| Production PostgreSQL | **EXTERNAL — company tomorrow** |
| Escrow API key/secret/base URL/webhook secret | **EXTERNAL PREREQUISITE** |
| Object storage | **EXTERNAL PREREQUISITE** (local FS for dev) |
| Notification providers | **EXTERNAL PREREQUISITE** |
| AI provider | **EXTERNAL PREREQUISITE** |
| Marketplace seller APIs | **Not required** for core admin-catalog product |
| M-Pesa | **Deferred** by business decision |

---

## 10. Remaining P0

1. Company production `DATABASE_URL` (+ migrate/backup/restore procedure execution)
2. Real Escrow credentials + provider API alignment + webhook endpoint reachability
3. Production media storage credentials
4. Confirm `PAYMENTS_ENABLED=true` only with full Escrow secrets (staging/prod validation already enforces)

---

## 11. Remaining P1

1. Multi-variant admin editor + gallery reorder/delete
2. Notification provider wiring beyond safe adapters
3. Full signed escrow E2E on shared local/staging env
4. Storefront visual polish pass where still sparse
5. Order refund/cancel policy UX when escrow supports it

---

## 12. Remaining P2

1. Marketplace adapters (optional secondary ingest)
2. Advanced SEO/search ranking
3. Observability dashboards beyond current metrics
4. M-Pesa re-enable behind feature flag when business requests

---

## 13. End-to-end test results (this phase)

| Suite | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (incl. escrow webhook idempotency, media storage, payment-initiate) |
| `pnpm run security:gate` | PASS |
| `pnpm run integrity` | PASS |
| Playwright escrow checkout | Specs updated to Escrow; **runtime PASS requires** API `ESCROW_WEBHOOK_SECRET` aligned with Playwright env (see `.env.example`) |

---

## 14. Production blockers

1. No company production database credentials in repo (correct) — migrate only after controlled config  
2. Escrow not live-configured  
3. Object storage not production-configured  
4. Do not enable `ESCROW_ALLOW_TEST_DOUBLE` in staging/production (config rejects this)

---

## 15. Exact next actions for the company

1. Provide production Postgres connection details (host, port, DB, user, password, SSL mode, pooler if any)
2. Provide Escrow vendor docs + `ESCROW_API_KEY`, `ESCROW_API_SECRET`, `ESCROW_BASE_URL`, `ESCROW_WEBHOOK_SECRET`
3. Provide object storage bucket + credentials + public CDN/base URL strategy
4. Provide notification + AI provider credentials when ready
5. Confirm go-live: admin-managed catalog only; Escrow only; M-Pesa deferred

---

## 16. Database credentials required tomorrow

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public&sslmode=...
```

Also: read replica URL (if any), connection pooler URL, backup bucket access for ops runbooks.

---

## 17. Escrow credentials required

```
ESCROW_API_KEY=
ESCROW_API_SECRET=
ESCROW_BASE_URL=
ESCROW_WEBHOOK_SECRET=
PAYMENT_PROVIDER=escrow
PAYMENTS_ENABLED=true
```

Webhook target: `POST /v1/webhooks/payments/escrow` with `x-escrow-signature` + `x-escrow-timestamp`.

---

## 18. Storage credentials required

Production object storage (choose one; adapter not hard-coded):

- Bucket name, region, access key/secret or IAM role  
- Public base URL / CDN for product images  
- Locally: `MEDIA_LOCAL_ROOT` + `MEDIA_PUBLIC_BASE_URL` (dev only)

---

## 19. Notification credentials required

Email (SMTP/API), SMS, WhatsApp — per chosen vendors. Without them, system stays on safe non-delivery adapters.

---

## 20. AI provider credentials required

Provider API key(s) for `apps/ai-service` / configured LLM — never expose to browser. Absent → controlled unavailable state.

---

## Implementation matrix (condensed)

| AREA | STATUS | PRIORITY |
|------|--------|----------|
| Admin catalog authority | IMPLEMENTED | P0 |
| Media upload (local) | PARTIAL (prod storage EXTERNAL) | P0 |
| Customer catalog/search | IMPLEMENTED | P0 |
| Cart/checkout | IMPLEMENTED | P0 |
| Escrow adapter + webhook | PARTIAL / EXTERNAL PREREQUISITE | P0 |
| M-Pesa customer UX | DISABLED | P0 |
| Orders admin/customer | PARTIAL | P1 |
| Notifications | PARTIAL / MOCK adapters | P1 |
| AI grounding | PARTIAL / EXTERNAL keys | P1 |
| Marketplace ingest | DISABLED as primary | P2 |

---

## Classification rationale

**NOT PRODUCTION READY** because live money movement, production DB, and production media/notification/AI credentials are not configured, and Escrow HTTP paths remain generic until vendor docs arrive.

The codebase is in a **stronger pre-production state**: fail-closed Escrow, admin-managed catalog path, local media upload, M-Pesa removed from CX, and automated tests covering webhook/idempotency paths.
