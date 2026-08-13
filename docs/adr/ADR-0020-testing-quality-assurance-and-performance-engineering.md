# ADR-0020: Testing, quality assurance, and performance engineering

- Status: **Accepted**
- Date: 2026-08-13
- Deciders: Platform Architecture; accepted by architecture program review on
  2026-08-13
- Aligns with: ADR-0002 TypeScript, ADR-0003 gates, ADR-0005–ADR-0019
- Scope: Test strategy, pyramid, CI gates, critical-path coverage, performance
  engineering targets
- Out of scope: Implementing the full suite now; mandating 100% line coverage

## 1. Context / Problem

Architecture is complete enough to define how quality is proven before
implementation sprawl invents inconsistent test practices.

## 2. Decision

**Testing pyramid:** many unit → fewer integration → selective E2E →
targeted security/load.

**Toolchain (aligned with repo):**

| Layer                   | Tool                                                          |
| ----------------------- | ------------------------------------------------------------- |
| Unit / integration (TS) | **Vitest** (already in packages)                              |
| React components        | **React Testing Library**                                     |
| E2E                     | **Playwright**                                                |
| a11y                    | **axe** (via RTL/Playwright)                                  |
| API contract            | OpenAPI diff / consumer checks (ADR-0009)                     |
| Load                    | k6 or Artillery (choose at implementation; not both required) |

Do not add Jest alongside Vitest without ADR amendment.

## 3. What must be tested (critical paths)

AuthN/Z, catalog/Offer, inventory movements/reservations, cart/checkout
idempotency, pricing/tax/promotions golden fixtures (ADR-0012), payments/
webhooks, orders/fulfillment transitions, refunds/returns, AI tool AuthZ +
prompt-injection cases, notification intents idempotency.

## 4. Test types

| Type         | Focus                                                                |
| ------------ | -------------------------------------------------------------------- |
| Unit         | Pure money math, policies, mappers, guards                           |
| Integration  | Nest + PG testcontainer; Redis optional                              |
| Contract     | OpenAPI vs SDK; provider adapter fixtures                            |
| E2E          | Customer checkout happy path; admin fulfill                          |
| Security     | IDOR, CSRF, webhook forgery, AuthZ bypass                            |
| Worker/queue | Idempotent job handlers; DLQ                                         |
| AI           | Tool schema validation; no invented price without tool; RAG citation |
| Performance  | Load on checkout/search; soak on webhooks                            |
| Resilience   | Timeout/retry; Redis down; provider 500                              |
| Smoke        | Post-deploy health + critical read                                   |

## 5. Coverage policy

- **No** arbitrary 100% line coverage gate.
- Require high confidence on critical modules (money, authz, payments,
  inventory) via explicit test lists / mutation or branch focus.
- New financial/auth code needs tests in the same PR.

## 6. CI quality gates

| Stage             | Checks                                                          |
| ----------------- | --------------------------------------------------------------- |
| PR                | lint, typecheck, unit, affected integration, secret scan, audit |
| Merge to main     | full build + tests green                                        |
| Staging deploy    | migrations + smoke + critical E2E subset                        |
| Production deploy | gated; smoke; rollback plan (ADR-0019)                          |

## 7. Performance targets (aspirational / unverified)

| Area                | Target                                      |
| ------------------- | ------------------------------------------- |
| API read p95        | &lt; 300 ms                                 |
| Search p95          | &lt; 500 ms                                 |
| Checkout commit p95 | &lt; 800 ms                                 |
| Webhook ack         | &lt; 1 s                                    |
| AI first token      | &lt; 2 s                                    |
| Frontend CWV        | Meet “good” Core Web Vitals as product goal |

Benchmark in staging before calling production-ready.

## 8. Production readiness gates (testing view)

Before real payments: pricing golden suite, payment webhook idempotency,
reservation/over-sell tests, backup restore drill evidence (ADR-0019),
security checklist (ADR-0018).

## 9. Alternatives rejected

Only E2E; 100% coverage vanity; multiple competing unit runners; skipping
payment webhook tests.

## 10. Dependencies

All domain ADRs define fixtures; ADR-0003/0019 CI; ADR-0017 perf signals.

## 11. Decision status

**Accepted.** Indexed in [DECISIONS.md](../DECISIONS.md).
