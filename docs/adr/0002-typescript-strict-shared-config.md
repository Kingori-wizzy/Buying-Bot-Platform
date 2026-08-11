# ADR-0002: Shared strict TypeScript configuration

- Status: Accepted
- Date: 2026-08-11
- Deciders: Platform Architecture
- Aligns with: [docs/ARCHITECTURE.md](../ARCHITECTURE.md)

## Context

Multiple TypeScript applications and packages will coexist. Divergent compiler settings cause inconsistent type safety and broken shared contracts.

## Decision

All TypeScript projects inherit presets from `@buying-bot/typescript-config`:

- `library.json` for shared packages
- `node.json` for Node services
- `bundler.json` for frontend/bundler apps

Policy includes `strict` and additional enterprise hardening (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, etc.). Path alias `@buying-bot/*` maps to `packages/*/src`.

## Consequences

- Uniform type safety across the monorepo.
- Apps cannot introduce weaker compiler settings without an ADR.
- Stricter optional/index typing may require more explicit null handling — accepted cost.

## Alternatives considered

| Option                | Why not                                    |
| --------------------- | ------------------------------------------ |
| Per-app tsconfig only | Drift and inconsistent safety              |
| Non-strict mode       | Incompatible with enterprise quality goals |
