# `@buying-bot/types`

## Responsibility

Own **cross-cutting TypeScript types and domain contracts** so apps and packages share a single vocabulary for commerce and platform concepts.

## In scope (when implemented)

- Shared entity/DTO/type aliases used by multiple apps
- API request/response TypeScript shapes (contracts layer)
- Discriminated unions and branded IDs used across boundaries

## Out of scope

- Runtime validation logic (see `@buying-bot/validation`)
- UI components (see `@buying-bot/ui`)
- Database drivers or query implementations (see `@buying-bot/database`)

## Consumers (intended)

All `apps/*` and other `packages/*` that need shared contracts

## Status

Foundation contracts implemented (health, API errors, RBAC vocabulary).
