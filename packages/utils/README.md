# `@buying-bot/utils`

## Responsibility

Provide **small, generic, domain-agnostic utilities** reused across apps and packages without encoding commerce or AI business rules.

## In scope

- Structured logging with secret redaction
- Request / correlation IDs
- Health aggregation helpers
- Graceful shutdown helpers
- Interim Node HTTP ops server (`createOpsServer`) per ADR-0004

## Out of scope

- Domain workflows (cart, checkout, merchandising)
- Product API frameworks
- Framework-specific UI hooks

## Consumers (intended)

Any `apps/*` or `packages/*`

## Status

Foundation implemented.
