# `@buying-bot/config`

## Responsibility

Provide **shared configuration utilities**: typed environment loading patterns, feature-flag accessors, and common config shape helpers used by multiple deployables.

## In scope (when implemented)

- Typed env parsing helpers (no secret values committed)
- Shared configuration interfaces and defaults patterns
- Cross-app config conventions (naming, required vs optional keys)

## Out of scope

- ESLint/Prettier/TypeScript toolchain configs (see `eslint-config`, `prettier-config`, `typescript-config`)
- Infrastructure Terraform/Kubernetes values (see `infrastructure/`)
- Business rules encoded as hard-coded product logic

## Consumers (intended)

`apps/api`, `apps/worker`, `apps/ai-service`, `apps/web`, `apps/admin` (as needed)

## Status

Foundation implemented: typed env schemas, fail-fast `loadEnv`, CORS/production guards.
