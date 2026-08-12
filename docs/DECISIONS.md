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
- Dependency patch bumps via Dependabot
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

| ADR                                                          | Title                                             | Status   | Date       |
| ------------------------------------------------------------ | ------------------------------------------------- | -------- | ---------- |
| [ADR-0001](./adr/0001-pnpm-turborepo-monorepo.md)            | Adopt pnpm workspaces + Turborepo monorepo        | Accepted | 2026-08-11 |
| [ADR-0002](./adr/0002-typescript-strict-shared-config.md)    | Shared strict TypeScript configuration            | Accepted | 2026-08-11 |
| [ADR-0003](./adr/0003-conventional-commits-quality-gates.md) | Conventional Commits and repository quality gates | Accepted | 2026-08-11 |
| [ADR-0004](./adr/0004-node-http-ops-bootstrap.md)            | Node.js HTTP ops bootstrap (interim)              | Accepted | 2026-08-12 |
| [ADR-0005](./adr/ADR-0005-backend-framework.md)              | Backend HTTP framework for `apps/api`             | Accepted | 2026-08-12 |
