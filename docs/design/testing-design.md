# Testing design

**Aligns with:** ADR-0020, 0003

## Pyramid

Unit (Vitest) → Integration (Vitest + PG testcontainer) → Contract (OpenAPI)
→ E2E (Playwright) → Security/Load targeted.

## Critical suites

AuthZ/IDOR; money/pricing golden; inventory concurrency; checkout
idempotency; payment webhook idempotency; refund snapshot; AI tool AuthZ;
notification intent idempotency.

## a11y

axe via RTL/Playwright on core journeys.

## CI gates

PR: lint, typecheck, unit, audit, secrets. Staging: migrate + smoke + E2E
subset. No 100% coverage vanity gate.

## Mapping

See RTM test category column.
