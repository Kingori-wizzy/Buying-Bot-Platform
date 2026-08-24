# Architecture decisions

**Aligns with:** [ARCHITECTURE.md](./ARCHITECTURE.md) (Enterprise Architecture Document)

This file is the index of Architecture Decision Records (ADRs) for the Buying Bot Platform. ADRs capture _why_ we chose a path so future teams can change course deliberately.

## Process

1. When a decision is significant (tooling, boundaries, security model, public contracts, deployment topology), draft an ADR in `docs/adr/`.
2. Use the next sequential number: `NNNN-short-title.md` (four digits).
3. Status lifecycle: `Proposed` → `Accepted` → (`Deprecated` | `Superseded` by ADR-XXXX).
4. Link accepted ADRs from this index.
5. If an ADR changes a principle in [ARCHITECTURE.md](./ARCHITECTURE.md), update that document in the same PR.

### When an ADR is required

- New deployable app or package boundary
- Package manager / build / CI platform changes
- Language or module system policy changes
- AuthN/AuthZ or secret-handling model
- Public API or event contract standards
- Anything that would be expensive to reverse

### When an ADR is not required

- Local refactors with no boundary impact
- Routine dependency patch bumps with no architecture impact
- Docs typos or non-normative examples

## ADR template

Create `docs/adr/NNNN-title.md` using:

```markdown
# ADR-NNNN: Title

- Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Deciders: names/roles
- Aligns with: docs/ARCHITECTURE.md

## Context

## Decision

## Consequences

## Alternatives considered
```

## Decision log

| ADR                                                                                              | Title                                                            | Status   | Date       |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------- | ---------- |
| [ADR-0001](./adr/0001-pnpm-turborepo-monorepo.md)                                                | Adopt pnpm workspaces + Turborepo monorepo                       | Accepted | 2026-08-11 |
| [ADR-0002](./adr/0002-typescript-strict-shared-config.md)                                        | Shared strict TypeScript configuration                           | Accepted | 2026-08-11 |
| [ADR-0003](./adr/0003-conventional-commits-quality-gates.md)                                     | Conventional Commits and repository quality gates                | Accepted | 2026-08-11 |
| [ADR-0004](./adr/0004-node-http-ops-bootstrap.md)                                                | Node.js HTTP ops bootstrap (interim)                             | Accepted | 2026-08-12 |
| [ADR-0005](./adr/ADR-0005-backend-framework.md)                                                  | Backend HTTP framework for `apps/api`                            | Accepted | 2026-08-12 |
| [ADR-0006](./adr/ADR-0006-database-and-data-architecture.md)                                     | Database, data storage, and persistence architecture             | Accepted | 2026-08-12 |
| [ADR-0007](./adr/ADR-0007-frontend-architecture.md)                                              | Frontend and application experience architecture                 | Accepted | 2026-08-13 |
| [ADR-0008](./adr/ADR-0008-authentication-and-identity-architecture.md)                           | Authentication, identity, and authorization architecture         | Accepted | 2026-08-13 |
| [ADR-0009](./adr/ADR-0009-api-contract-and-communication-architecture.md)                        | API contract and communication architecture                      | Accepted | 2026-08-13 |
| [ADR-0010](./adr/ADR-0010-catalog-product-inventory-search-architecture.md)                      | Catalog, product, inventory, and search architecture             | Accepted | 2026-08-13 |
| [ADR-0011](./adr/ADR-0011-cart-checkout-orders-payments-architecture.md)                         | Cart, checkout, orders, and payments architecture                | Accepted | 2026-08-13 |
| [ADR-0012](./adr/ADR-0012-pricing-promotions-tax-financial-calculation-architecture.md)          | Pricing, promotions, tax, and financial calculation architecture | Accepted | 2026-08-13 |
| [ADR-0013](./adr/ADR-0013-fulfillment-shipping-delivery-returns-order-lifecycle-architecture.md) | Fulfillment, shipping, delivery, returns, and order lifecycle    | Accepted | 2026-08-13 |
| [ADR-0014](./adr/ADR-0014-notifications-and-omnichannel-communication-architecture.md)           | Notifications and omnichannel communication architecture         | Accepted | 2026-08-13 |
| [ADR-0015](./adr/ADR-0015-ai-rag-agent-and-tool-architecture.md)                                 | AI, RAG, agent, and tool architecture                            | Accepted | 2026-08-13 |
| [ADR-0016](./adr/ADR-0016-external-integrations-and-omnichannel-commerce-architecture.md)        | External integrations and omnichannel commerce architecture      | Accepted | 2026-08-13 |
| [ADR-0017](./adr/ADR-0017-observability-monitoring-and-operational-reliability-architecture.md)  | Observability, monitoring, and operational reliability           | Accepted | 2026-08-13 |
| [ADR-0018](./adr/ADR-0018-security-privacy-compliance-and-audit-architecture.md)                 | Security, privacy, compliance, and audit architecture            | Accepted | 2026-08-13 |
| [ADR-0019](./adr/ADR-0019-deployment-infrastructure-cicd-and-disaster-recovery-architecture.md)  | Deployment, infrastructure, CI/CD, and disaster recovery         | Accepted | 2026-08-13 |
| [ADR-0020](./adr/ADR-0020-testing-quality-assurance-and-performance-engineering.md)              | Testing, quality assurance, and performance engineering          | Accepted | 2026-08-13 |
