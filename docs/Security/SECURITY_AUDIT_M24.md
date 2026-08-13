# Security audit — M24

**Date:** 2026-08-13  
**Method:** Local/CI checklist verification against repository state.  
**Not a substitute for:** formal penetration test, red team, or third-party audit.

## Checklist results

| Control                             | Result  | Evidence                                                                             |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| No `.env` committed                 | PASS    | `.gitignore` ignores `.env` / `.env.*`; only `.env.example` + `.env.staging.example` |
| Secret scan in CI                   | PASS    | `gitleaks/gitleaks-action` in `.github/workflows/ci.yml`                             |
| Local gitleaks binary               | BLOCKED | Not installed on operator workstation this run — rely on CI                          |
| Dependency audit                    | PASS    | `pnpm audit --audit-level=high` in verify/CI                                         |
| Wildcard CORS blocked in production | PASS    | `assertSafeCorsOrigin` + `security.regression.test.ts`                               |
| CSRF on session mutations           | PASS    | `CsrfGuard` + regression test                                                        |
| Admin MFA                           | PASS    | MFA required for admin realm ops; invalid code tests                                 |
| Helmet / HSTS staging+prod          | PASS    | API bootstrap helmet config                                                          |
| No stack traces in prod errors      | PASS    | security regression coverage                                                         |
| Service JWT API↔AI                  | PASS    | service-jwt modules                                                                  |
| Upload validation helper            | PASS    | `upload-validation.ts`                                                               |
| Payments fail-closed without keys   | PASS    | env refine when `PAYMENTS_ENABLED`                                                   |
| Secrets manager (Vault/SM)          | BLOCKED | EXTERNAL                                                                             |
| Live WAF / bot management           | BLOCKED | EXTERNAL edge                                                                        |
| Formal pen-test                     | BLOCKED | EXTERNAL engagement                                                                  |
| Production debug endpoints off      | PASS    | no debug routes in product API surface                                               |

## Grep hygiene (sample)

Patterns scanned informally for obvious committed secrets (`AKIA`, `BEGIN PRIVATE KEY`, `sk-live`): clean in tracked source. Continue CI gitleaks as source of truth.

## Residual risk

Highest residual risks are **operational**: secret distribution, host hardening,
and untested live payment credentials — all EXTERNAL.
