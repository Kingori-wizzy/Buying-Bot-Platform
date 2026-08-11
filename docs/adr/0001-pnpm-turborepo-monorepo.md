# ADR-0001: Adopt pnpm workspaces + Turborepo monorepo

- Status: Accepted
- Date: 2026-08-11
- Deciders: Platform Architecture
- Aligns with: [docs/ARCHITECTURE.md](../ARCHITECTURE.md)

## Context

The Buying Bot Platform spans multiple deployables (web, admin, API, AI, worker, future mobile) plus shared packages and documentation. We need atomic cross-cutting changes, shared contracts, and scalable CI without premature multi-repo overhead.

## Decision

Use a **single monorepo** managed with:

- **pnpm workspaces** for dependency installation and workspace linking
- **Turborepo** for task orchestration and caching (`build`, `typecheck`, `test`, `lint`, `dev`)

Repository topology: `apps/`, `packages/`, `infrastructure/`, `docs/`, `.github/`, `.vscode/`.

## Consequences

- Shared packages and config changes can ship with consumer updates in one PR.
- CI and local scripts stay uniform via root Turbo pipelines.
- Teams must respect dependency direction: apps → packages, never the reverse.
- Application framework choices remain open and require future ADRs.

## Alternatives considered

| Option        | Why not now                                             |
| ------------- | ------------------------------------------------------- |
| Nx            | Strong, but heavier day-zero ceremony for current scope |
| Multi-repo    | Slows shared contract evolution for omnichannel + AI    |
| Bazel / Pants | Excessive operational cost before product code exists   |
