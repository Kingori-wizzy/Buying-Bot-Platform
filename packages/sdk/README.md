# `@buying-bot/sdk`

## Responsibility

Typed HTTP client for Nest REST (`/v1/...`) used by `apps/web`, `apps/admin`,
and future mobile clients.

## Included

- `PlatformSdk`: health, auth (csrf/login/register/me/MFA), catalog, search,
  cart, checkout, orders, admin catalog/inventory/pricing helpers
- Cookie sessions via `credentials: 'include'`
- CSRF double-submit (`GET /v1/auth/csrf` + `x-csrf-token`)
- `PlatformApiError`, `formatMoneyMinor`, `firstOfferPrice`

## Out of scope

- Server route handlers (`apps/api`)
- UI rendering (`@buying-bot/ui`)
- Database access

## Status

Hand-maintained methods aligned to current Nest controllers (OpenAPI codegen later).
