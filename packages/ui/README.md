# `@buying-bot/ui`

## Responsibility

Provide **shared user-interface building blocks** consumed by customer-facing and admin applications (and future mobile web surfaces where applicable).

## In scope (when implemented)

- Design-system primitives (buttons, inputs, layout primitives, typography helpers)
- Shared visual tokens/themes consumed by `apps/web` and `apps/admin`
- Accessible, reusable presentational components with no business workflows

## Out of scope

- Page-level features, checkout flows, or admin screens (belong in apps)
- API calls or domain orchestration (use `@buying-bot/sdk` / apps)
- Server-only persistence or auth protocol logic

## Consumers (intended)

`apps/web`, `apps/admin`, future `apps/mobile` (as applicable)

## Status

Package folder only — no UI implementation yet.
