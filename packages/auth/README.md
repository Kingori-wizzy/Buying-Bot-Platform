# `@buying-bot/auth`

## Responsibility

Provide **shared authentication and authorization building blocks**—session/token contracts, guard helpers, and role/permission types—used consistently across channels.

## In scope (when implemented)

- Auth-related types and interfaces
- Shared middleware/guard utilities for API and apps
- Permission/role vocabulary shared by admin and API

## Out of scope

- Full identity-provider product code owned by a single app without reuse
- Secret storage of keys/certificates in the package
- UI login pages (compose with `@buying-bot/ui` inside apps)

## Consumers (intended)

`apps/api`, `apps/admin`, `apps/web`, `apps/worker` (as applicable)

## Status

Contracts implemented (`Authenticator`, `Authorizer`, permission helpers). No IdP/session adapter yet.
