# Shared packages

Reusable libraries for the Buying Bot Platform. Deployable applications live under `apps/`; shared code and contracts live here.

**Policy:** Package folders below are architectural placeholders. No business logic is implemented yet.

**Aligns with:** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — apps may depend on packages; packages must not depend on apps.

## Domain packages

| Package                        | npm name                 | Responsibility                                                       |
| ------------------------------ | ------------------------ | -------------------------------------------------------------------- |
| [`ui/`](./ui/)                 | `@buying-bot/ui`         | Shared UI primitives and design-system building blocks               |
| [`types/`](./types/)           | `@buying-bot/types`      | Cross-app TypeScript types and shared domain contracts               |
| [`config/`](./config/)         | `@buying-bot/config`     | Shared runtime/configuration helpers and typed env patterns          |
| [`database/`](./database/)     | `@buying-bot/database`   | Data-access abstractions and persistence shared utilities            |
| [`auth/`](./auth/)             | `@buying-bot/auth`       | Authentication/authorization shared utilities and contracts          |
| [`validation/`](./validation/) | `@buying-bot/validation` | Shared input validation schemas and validators                       |
| [`utils/`](./utils/)           | `@buying-bot/utils`      | Generic, domain-agnostic helpers                                     |
| [`sdk/`](./sdk/)               | `@buying-bot/sdk`        | Typed client SDK for consuming platform APIs                         |
| [`ai-core/`](./ai-core/)       | `@buying-bot/ai-core`    | Shared AI primitives (prompts/tools/types) without app orchestration |

## Engineering config packages (existing)

| Package                                      | npm name                        | Responsibility                     |
| -------------------------------------------- | ------------------------------- | ---------------------------------- |
| [`typescript-config/`](./typescript-config/) | `@buying-bot/typescript-config` | Shared TypeScript compiler presets |
| [`eslint-config/`](./eslint-config/)         | `@buying-bot/eslint-config`     | Shared ESLint flat config          |
| [`prettier-config/`](./prettier-config/)     | `@buying-bot/prettier-config`   | Shared Prettier policy             |
