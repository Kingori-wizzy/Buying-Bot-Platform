# ADR-0003: Conventional Commits and repository quality gates

- Status: Accepted
- Date: 2026-08-11
- Deciders: Platform Architecture
- Aligns with: [docs/ARCHITECTURE.md](../ARCHITECTURE.md)

## Context

Omnichannel commerce changes need auditable history, predictable releases, and enforced quality before merge.

## Decision

Adopt:

- **Conventional Commits** enforced by Commitlint
- **Husky** + **lint-staged** for pre-commit format/lint/typecheck
- **ESLint** + **Prettier** shared configs
- **GitHub Actions CI**: install → lint → typecheck → build → test

Versioning and changelog strategy derive from Conventional Commits ([versioning-strategy.md](../standards/versioning-strategy.md)).

## Consequences

- Non-conventional commit messages are rejected.
- Formatting/lint/type issues are caught before push/CI when hooks run.
- Release automation can later map commit types to SemVer bumps.

## Alternatives considered

| Option                     | Why not                           |
| -------------------------- | --------------------------------- |
| Free-form commits          | Poor automation and review signal |
| CI-only quality (no hooks) | Slower feedback, noisier CI       |
