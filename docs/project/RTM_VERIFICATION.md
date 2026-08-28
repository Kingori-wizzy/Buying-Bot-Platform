# RTM verification (final pre-production, 2026-08-28)

Maps critical functional requirement categories to modules, tests, and results.
Results are engineering-local unless marked EXTERNAL.

| FR category              | Module / path                   | Tests / evidence                                                                                                                            | Result                                                         |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Health & ops             | `apps/api` health + metrics     | unit tests + staging smoke (`/health/live`, `/health/ready`, `/metrics`)                                                                    | PASS                                                           |
| AuthN register/login     | `apps/api/src/auth`             | staging smoke register/login + unit tests                                                                                                   | PASS                                                           |
| AuthZ RBAC + admin MFA   | guards + MFA crypto             | `security.regression.test.ts`; MFA runbook `docs/runbooks/ADMIN_MFA_ENROLLMENT.md`; production preflight enforces `ADMIN_MFA_REQUIRED=true` | PASS (staging MFA off for E2E; prod config ready)              |
| Catalog public/admin     | `catalog/*`                     | API tests + staging smoke + admin E2E `56ef9a0`                                                                                             | PASS (staging admin catalog journey)                           |
| Admin-managed catalog CX | admin catalog + web + AI        | marketplace disabled; E2E admin-catalog-journey                                                                                             | PASS                                                           |
| Product CSV import       | catalog import + worker         | `catalog-csv.test.ts`                                                                                                                       | PASS                                                           |
| Marketplace aggregation  | `product-sources`               | gate test + `MARKETPLACE_INGESTION_ENABLED` preflight                                                                                       | DEFERRED (intentional)                                         |
| Inventory reserve/adjust | `inventory/*`                   | unit tests (concurrency skipped in CI)                                                                                                      | PASS                                                           |
| Pricing / tax calc       | `pricing/*`                     | financial-calculation.engine.test.ts                                                                                                        | PASS                                                           |
| Cart guest/auth merge    | `cart/*`                        | staging smoke `/v1/cart`                                                                                                                    | PASS                                                           |
| Checkout + orders        | `checkout/*`                    | customer-purchase-flow E2E (test-double escrow)                                                                                             | PASS (LIVE PAYMENT = DEFERRED)                                 |
| Digital fulfillment      | `checkout/digital-fulfillment`  | unit + staging verification script                                                                                                          | PASS                                                           |
| Payments Escrow          | `payments/escrow.adapter`       | unit tests; staging `ESCROW_ALLOW_TEST_DOUBLE=true`                                                                                         | DEFERRED live (test-double only)                               |
| AI chat/tools/RAG        | `ai-service`, knowledge         | ai-core 19/19; staging `/v1/ai/chat` → 502 (OpenAI quota)                                                                                   | BLOCKED — EXTERNAL (OpenAI billing)                            |
| Notifications async      | notifications + worker          | notifications.test.ts                                                                                                                       | PASS (console adapters)                                        |
| Media storage            | `media/create-object-storage`   | unit tests; staging `MEDIA_DRIVER=local`                                                                                                    | PARTIAL (prod S3 documented; creds EXTERNAL)                   |
| Staging topology         | compose.staging.yml             | 8/8 containers healthy on VPS `56ef9a0`                                                                                                     | PASS                                                           |
| Production preflight     | `production-preflight.mjs`      | bootstrap `.env.production.local` audit                                                                                                     | PASS                                                           |
| Security gate            | `security-gate.mjs`             | 2026-08-28 run                                                                                                                              | PASS                                                           |
| Dependency audit         | `pnpm audit --audit-level=high` | 0 high vulnerabilities                                                                                                                      | PASS                                                           |
| DR restore               | backup/restore scripts          | VPS backups under `/var/backups/buyingbot/`                                                                                                 | PASS (backups exist; isolated restore not re-run this session) |
| Compliance legal         | policies                        | —                                                                                                                                           | BLOCKED — business sign-off                                    |

**Unit test totals (2026-08-28):** ai-core 19/19, sdk 9/9, api 36/36 (16 skipped integration).

**Staging E2E (prior session + deploy `56ef9a0`):** 11/12 PASS; assistant-conversation FAIL (OpenAI 429).

**Overall RTM engineering:** PASS with EXTERNAL DEFERRED/BLOCKED items remaining.
