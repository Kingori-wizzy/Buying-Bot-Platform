# Final gap closure matrix

**Version:** 0.1.0-rc.3  
**Date:** 2026-08-18  
**Authority:** Accepted ADRs 0005–0020 + verified implementation

Classification of remaining work:

- **FIX LOCALLY** — implemented in this pass or already present
- **VERIFY LOCALLY** — automated/local evidence exists
- **EXTERNAL PREREQUISITE** — credentials/hosting/legal
- **DEFERRED BY ADR** — accepted deferral (do not invent a competing design)
- **NOT APPLICABLE** — out of current product scope

| Requirement                   | Current state                               | Evidence                                                   | Gap                                                   | Action                                            | Status                 |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ---------------------- |
| `pnpm run verify` audit       | `deepmerge-ts` overridden to 8.0.1          | `pnpm audit --audit-level=high` → no known vulnerabilities | Prisma `@prisma/config` still depends on deepmerge-ts | Override in root `package.json`                   | FIX LOCALLY            |
| Customer register/login       | Implemented                                 | journey + auth.integration                                 | Email provider EXTERNAL                               | Keep token verification local                     | VERIFY LOCALLY         |
| Catalog list/PDP              | Active offers only on public list           | catalog.service `ACTIVE_OFFER_WHERE`                       | Test leftovers were ACTIVE without offers             | Seed demotes test names; UI marks not purchasable | FIX LOCALLY            |
| Search FTS                    | Implemented                                 | journey search                                             | pgvector is RAG not catalog (ADR-0010)                | None                                              | VERIFY LOCALLY         |
| Cart add/update               | Implemented                                 | journey PATCH + E2E                                        | Merge for guest→auth                                  | cart.merge.test                                   | VERIFY LOCALLY         |
| Checkout totals               | Server minor units                          | checkout `payableMinor`                                    | Client must not author totals                         | E2E asserts payableMinor                          | VERIFY LOCALLY         |
| Inventory reservation         | Transactional                               | inventory.concurrency.test                                 | Shared-DB test isolation                              | Expiry + oversell tests                           | VERIFY LOCALLY         |
| Payment outbox                | Worker handler wired                        | worker payment-initiate.test                               | Live Daraja HTTP                                      | Sandbox only                                      | FIX LOCALLY            |
| Sandbox webhook → PAID        | HMAC + idempotent confirm                   | payments.webhook.test + journey                            | Live M-Pesa EXTERNAL                                  | Sandbox webhook is not live verification          | VERIFY LOCALLY         |
| Duplicate webhook             | Idempotent                                  | webhook test duplicate event id                            | Concurrent apply race                                 | COMMITTED reservation stays PAID                  | FIX LOCALLY            |
| Late payment after expiry     | RECONCILIATION_HOLD                         | webhook late-payment test                                  | Ops must reconcile                                    | Document                                          | FIX LOCALLY            |
| Order IDOR                    | Customer GET requires owner                 | checkout.service getOrder                                  | Guest orders (null userId) remain capability-URL      | Admin uses `/v1/admin/orders/:id`                 | FIX LOCALLY            |
| Admin orders                  | List + detail API                           | SDK adminListOrders/adminGetOrder                          | MFA UX partial                                        | Server RBAC authoritative                         | FIX LOCALLY            |
| AI tools                      | 9 tools, no Prisma                          | ai-core + guardrails tests                                 | Vendor keys EXTERNAL                                  | 503 when AI down                                  | VERIFY LOCALLY         |
| AI SSE web                    | SDK `chatStream` + assistant UI             | sdk parseSseJsonStream test; AI service stream test        | True token streaming is chunked post-generate         | Architecture remains WEB→API→AI                   | FIX LOCALLY            |
| RAG                           | pgvector + FTS fallback                     | knowledge.retrieve.test                                    | Production corpus EXTERNAL                            | —                                                 | VERIFY LOCALLY         |
| Notifications                 | Adapter + queue                             | notifications.test                                         | SMTP/SMS/WhatsApp EXTERNAL                            | Stubs                                             | EXTERNAL PREREQUISITE  |
| Fulfillment SHIPPED/DELIVERED | Not in OrderStatus                          | schema OrderStatus                                         | ADR-0013                                              | Do not fake shipped                               | DEFERRED BY ADR        |
| External product feeds        | None                                        | catalog is merchant-managed                                | Affiliate APIs                                        | Adapters when contracts exist                     | EXTERNAL PREREQUISITE  |
| OpenAPI codegen               | Hand SDK                                    | packages/sdk                                               | Artifact pipeline                                     | Optional                                          | DEFERRED BY ADR        |
| Performance p95               | k6 scripts only                             | PERFORMANCE_VALIDATION_M24                                 | Staging host                                          | Do not invent numbers                             | EXTERNAL PREREQUISITE  |
| DR restore                    | Local drill                                 | RELIABILITY_VALIDATION_M24                                 | Cloud PITR                                            | —                                                 | VERIFY LOCALLY (local) |
| Pen-test                      | Not done                                    | —                                                          | Vendor                                                | —                                                 | EXTERNAL PREREQUISITE  |
| Browser E2E                   | Playwright web skipped without WEB_BASE_URL | e2e/customer-purchase-flow.spec.ts                         | Running Next.js                                       | Start web + set WEB_BASE_URL                      | VERIFY LOCALLY         |
| Production DNS/TLS            | Templates only                              | .env.production.example                                    | Host                                                  | —                                                 | EXTERNAL PREREQUISITE  |

**Rule:** PRODUCTION READY requires EXTERNAL rows to be verified. They are not.
