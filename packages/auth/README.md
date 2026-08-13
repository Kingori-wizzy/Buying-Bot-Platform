# `@buying-bot/auth`

## Responsibility

Provide **shared authentication and authorization building blocks**—principal
contracts, permission helpers, and authorizer ports—used consistently across
channels.

## In scope

- `AuthPrincipal`, `Authenticator`, `Authorizer`
- `hasPermission`, `flattenRolePermissions`, `DefaultAuthorizer`
- Permission catalog helpers and ownership `assertSameSubject`
- Opaque token helpers (`createOpaqueToken`, `hashToken`)

## Out of scope

- Nest guards / cookies / Prisma (live in `apps/api`)
- Secret material storage
- UI login pages

## Status

Contracts + pure helpers implemented. Nest adapters live in `apps/api` (M4–M5).
