# `@buying-bot/utils`

## Responsibility

Provide **small, generic, domain-agnostic utilities** reused across apps and packages without encoding commerce or AI business rules.

## In scope (when implemented)

- Pure helpers (dates/strings/collections/result types) with no I/O
- Shared formatting utilities that are not UI components
- Cross-cutting helpers that would otherwise be copy-pasted

## Out of scope

- Domain workflows (cart, checkout, merchandising)
- Network clients (see `@buying-bot/sdk`)
- Framework-specific hooks that belong in `@buying-bot/ui` or apps

## Consumers (intended)

Any `apps/*` or `packages/*`

## Status

Package folder only — no utilities implemented yet.
