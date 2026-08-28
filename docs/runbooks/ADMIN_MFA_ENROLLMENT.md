# Admin MFA enrollment (TOTP)

**Aligns with:** SRS FR-AUTH-006, ADR-0008, BR-AUTH-003

Admin MFA is **mandatory in production** (`ADMIN_MFA_REQUIRED=true`). Enrollment is
API-driven; there is no in-app enrollment wizard yet. Use this runbook for
first-time admin setup and recovery.

## Production configuration

```text
ADMIN_MFA_REQUIRED=true
```

Never disable MFA in production to make tests pass.

## Prerequisites

- Admin user with `ADMIN` or `SUPER_ADMIN` role
- `realm: admin` login (separate session cookie from customers)
- HTTPS origin matching `CORS_ORIGIN`

## Enrollment flow (API)

1. **Login** as admin (`POST /v1/auth/login` with `realm: admin`).
2. **Enroll** — `POST /v1/auth/mfa/totp/enroll` (authenticated admin session).
   - Response includes `secret` (base32) and `otpauthUrl` for authenticator apps.
   - **Do not log, commit, or paste the secret in tickets.**
3. **Confirm** — `POST /v1/auth/mfa/totp/confirm` with `{ "code": "123456" }`.
   - Saves encrypted TOTP factor and returns one-time recovery codes.
   - Store recovery codes in the company password manager only.
4. **Subsequent logins** when `ADMIN_MFA_REQUIRED=true`:
   - Login returns `{ mfaRequired: true }` without full admin API access.
   - **Challenge** — `POST /v1/auth/mfa/challenge` with TOTP code.
   - Session receives `mfaSatisfiedAt`; admin APIs then authorize.

## Invalid / missing MFA

| Case                          | Expected                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| Wrong TOTP code               | `INVALID_MFA_CODE`                                                  |
| MFA required but not enrolled | Login may succeed; admin APIs return `MFA_REQUIRED` until challenge |
| Customer session on admin API | `401` / `403`                                                       |
| Unauthenticated admin API     | `401`                                                               |

## Logout

`POST /v1/auth/logout` clears the admin session cookie. Re-login requires MFA
again when `ADMIN_MFA_REQUIRED=true`.

## Staging

Staging may keep `ADMIN_MFA_REQUIRED` unset for E2E automation. Production
preflight **fails** if `ADMIN_MFA_REQUIRED` is not `true`.

## Security notes

- TOTP secrets are encrypted at rest (AES-256-GCM).
- Audit events must not contain TOTP secrets, recovery codes, or passwords.
- Rotate recovery codes after use; re-enroll if authenticator is lost (operational procedure).
