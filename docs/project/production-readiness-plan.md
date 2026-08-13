# Production readiness plan

**Baseline:** [PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md) (foundation ~64/100 historically; not commerce-ready)

| Area                                    | Current                                      | Required                   | Gap           | Action      | Gate                |
| --------------------------------------- | -------------------------------------------- | -------------------------- | ------------- | ----------- | ------------------- |
| Architecture                            | ADR-0005–0020 Accepted                       | Same + SDS/SRS             | Docs baseline | M0 complete | Docs audit          |
| AuthN/Z                                 | Sessions/RBAC/MFA (M4–M5)                    | Full E2E+hardening         | Residual      | M20/M24     | E2E+security        |
| Database                                | Domain schemas M6–M12                        | PITR + drills              | Ops           | M22         | Drill evidence      |
| Backups                                 | Documented                                   | PITR + drills              | Ops           | M22         | Drill evidence      |
| Payments                                | M-Pesa adapter + webhooks + outbox (M11–M12) | Live sandbox STK + ops     | Sandbox ops   | M11–M12/M24 | Sandbox+idempotency |
| Rate limits                             | Auth routes (M4)                             | Redis limits platform-wide | Expand        | M20         | Abuse tests         |
| Observability                           | `/metrics` + OTel seam (M19)                 | Alerts/SLO burn            | Partial       | M19/M24     | Dashboards          |
| Testing                                 | Unit+auth+commerce+AI tests                  | Critical-path suite        | Expand        | M2–M21      | CI gates            |
| Frontend                                | Storefront/admin + `/assistant`              | Full E2E purchase          | Residual      | M13–M14/M24 | E2E                 |
| AI                                      | ai-service + RAG + tools (M15–M17)           | Eval harness depth         | Residual      | M15–M17/M24 | Eval                |
| Security headers                        | Helmet CSP/HSTS/API keys (M20)               | Pen-test                   | Residual      | M20/M24     | Checklist           |
| Secrets manager                         | .env.example                                 | Vault/SM                   | Ops           | M19–M24     | No secrets in git   |
| DR                                      | Scripts + dry-run evidence (M22)             | Live restore drill         | Ops           | M22/M24     | Sign-off            |
| Compliance                              | Not claimed                                  | Legal review               | Legal         | pre-M25     | Counsel             |
| Catalog/Inventory/Pricing/Cart/Checkout | APIs M6–M10                                  | Storefront UX              | Frontend      | M13–M14     | E2E purchase        |

**Rule:** Do not mark production-ready without repository evidence.
