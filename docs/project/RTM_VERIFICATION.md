# RTM verification (M24)

Maps critical functional requirement categories to modules, tests, and results.
Results are engineering-local unless marked EXTERNAL.

| FR category              | Module / path               | Tests / evidence                              | Result                                     |
| ------------------------ | --------------------------- | --------------------------------------------- | ------------------------------------------ |
| Health & ops             | `apps/api` health + metrics | `apps/api/src/index.test.ts`, smoke           | PASS                                       |
| AuthN register/login     | `apps/api/src/auth`         | `auth.integration.test.ts`                    | PASS                                       |
| AuthZ RBAC + admin MFA   | guards + MFA crypto         | auth integration + security regression        | PASS                                       |
| Catalog public/admin     | `catalog/*`                 | API tests + list smoke                        | PASS                                       |
| Inventory reserve/adjust | `inventory/*`               | concurrency test                              | PASS                                       |
| Pricing / tax calc       | `pricing/*`                 | financial-calculation.engine.test.ts          | PASS                                       |
| Cart guest/auth merge    | `cart/*`                    | cart.merge.test.ts                            | PASS                                       |
| Checkout idempotent      | `checkout/*`                | checkout module + webhook path                | PASS                                       |
| Payments M-Pesa          | `payments/*`                | payments.webhook.test.ts                      | PARTIAL (sandbox keys EXTERNAL)            |
| AI chat/tools/RAG        | `ai-service`, knowledge     | ai.guardrails, retrieve tests                 | PARTIAL (vendor keys EXTERNAL)             |
| Notifications async      | notifications + worker      | notifications.test.ts                         | PASS (console adapters)                    |
| Storefront UI            | `apps/web`                  | vitest + Playwright skip without WEB_BASE_URL | PARTIAL                                    |
| Admin UI                 | `apps/admin`                | vitest                                        | PARTIAL                                    |
| Staging topology         | compose.staging.yml         | scripts/staging/*                             | PASS (local compose)                       |
| DR restore               | backup/restore scripts      | M24 restore drill evidence                    | PARTIAL/VERIFIED locally when drill passes |
| Perf SLOs                | k6 scripts                  | PERFORMANCE_VALIDATION_M24                    | BLOCKED without k6 run                     |
| Compliance legal         | policies                    | COMPLIANCE_READINESS                          | BLOCKED legal approval                     |

**Overall RTM engineering:** PASS with EXTERNAL PARTIAL/BLOCKED items remaining.
