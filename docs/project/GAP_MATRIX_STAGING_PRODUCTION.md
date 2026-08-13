# Gap matrix — staging → production (verified 2026-08-13)

| AREA                    | STATUS   | EVIDENCE                                   | BLOCKER                     | ACTION                  |
| ----------------------- | -------- | ------------------------------------------ | --------------------------- | ----------------------- |
| Local verify            | VERIFIED | `pnpm run verify` PASS                     | —                           | Maintain                |
| Security gate           | VERIFIED | `pnpm run security:gate` PASS              | —                           | Maintain                |
| Data integrity          | VERIFIED | `pnpm run integrity` PASS                  | —                           | Maintain                |
| API smoke               | VERIFIED | Expanded `scripts/smoke/staging-smoke.mjs` | —                           | Maintain                |
| AI degradation          | VERIFIED | API returns 503 when AI unreachable        | —                           | Maintain                |
| Staging compose         | VERIFIED | `docker-compose.staging.yml`               | Remote host EXTERNAL        | Deploy when host exists |
| Staging deploy workflow | VERIFIED | `.github/workflows/staging-deploy.yml`     | `STAGING_SSH_HOST` EXTERNAL | Configure secrets       |
| Production secrets      | BLOCKED  | `.env.production.example` only             | Secrets manager EXTERNAL    | Inject on host          |
| TLS / DNS               | BLOCKED  | nginx TLS comments                         | Certs/DNS EXTERNAL          | Provision edge          |
| Live M-Pesa             | BLOCKED  | Adapter + `PAYMENTS_ENABLED=false`         | Live keys EXTERNAL          | Enable after legal      |
| Pen-test                | BLOCKED  | Checklist docs                             | Vendor EXTERNAL             | Schedule                |
| Legal/ToS               | BLOCKED  | Compliance doc                             | Counsel EXTERNAL            | Approve                 |
| On-call                 | BLOCKED  | Runbooks                                   | Staffing EXTERNAL           | Assign                  |
| k6 measured SLOs        | PARTIAL  | Scripts in `infrastructure/perf/k6`        | k6 binary / staging URL     | Run on staging          |
| Local DR restore        | VERIFIED | M24 drill evidence                         | Offsite backup EXTERNAL     | Schedule offsite        |
| Kubernetes              | N/A      | ADR-0019 deferred                          | —                           | Do not introduce        |

**Classification:** CONDITIONALLY PRODUCTION READY
