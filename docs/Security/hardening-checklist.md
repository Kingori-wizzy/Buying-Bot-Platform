# Security hardening checklist (ADR-0018) — M20

Status legend: **IMPLEMENTED** | **PARTIAL** | **PLANNED**

| Control                                       | Status      | Notes                                          |
| --------------------------------------------- | ----------- | ---------------------------------------------- |
| Helmet CSP                                    | IMPLEMENTED | Strict-ish defaults in API bootstrap           |
| HSTS (staging/production)                     | IMPLEMENTED | Enabled when NODE_ENV is staging/production    |
| Referrer-Policy                               | IMPLEMENTED | `no-referrer`                                  |
| Frameguard deny                               | IMPLEMENTED |                                                |
| CSRF on session mutations                     | IMPLEMENTED | Regression test                                |
| Wildcard CORS blocked in production           | IMPLEMENTED | `assertSafeCorsOrigin`                         |
| No stack traces in production errors          | IMPLEMENTED | Regression test                                |
| Service JWT between API ↔ AI                  | IMPLEMENTED |                                                |
| API keys hashed storage + admin create/revoke | IMPLEMENTED | Foundation; scopes JSON                        |
| File upload mime/size validation helper       | IMPLEMENTED | `upload-validation.ts`                         |
| Dependency audit in CI                        | IMPLEMENTED | `pnpm audit --audit-level=high`                |
| Secrets never in git/logs                     | PARTIAL     | Scrubbing in AI guardrails; continue reviews   |
| WAF / bot management                          | PLANNED     | Edge (M23+)                                    |
| Formal pen-test                               | PLANNED     | Pre-prod                                       |
| MFA enforcement for all admin                 | IMPLEMENTED | Guards already require MFA for admin realm ops |

Do not claim measured security SLOs beyond what tests cover.
