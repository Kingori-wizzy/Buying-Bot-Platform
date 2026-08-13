# Production readiness plan

**Baseline:** [PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md) (foundation ~64/100 historically; not commerce-ready)

| Area | Current | Required | Gap | Action | Gate |
| --- | --- | --- | --- | --- | --- |
| Architecture | ADR-0005–0020 Accepted | Same + SDS/SRS | Docs baseline | M0 complete | Docs audit |
| AuthN/Z | Contracts only | Full sessions/RBAC/MFA | Impl | M4–M5 | E2E+security |
| Database | Ports only | Prisma+PG+migrations | Impl | M3 | CI migrate |
| Backups | Documented | PITR + drills | Ops | M22 | Drill evidence |
| Payments | None | M-Pesa + webhooks + outbox | Impl | M11–M12 | Sandbox+idempotency |
| Rate limits | None | Redis limits | Impl | M4/M20 | Abuse tests |
| Observability | Ops logs/health | OTel+alerts | Impl | M19 | Dashboards |
| Testing | Package unit tests | Critical-path suite | Expand | M2–M21 | CI gates |
| Frontend | Shells | Next storefront/admin | Impl | M13–M14 | E2E |
| AI | Ports only | Service+tools+RAG | Impl | M15–M17 | Eval |
| Security headers | Minimal ops | Full product headers | Impl | M20 | Checklist |
| Secrets manager | .env.example | Vault/SM | Ops | M19–M24 | No secrets in git |
| DR | RPO24h/RTO4h paper | Drill-proven | Ops | M22 | Sign-off |
| Compliance | Not claimed | Legal review | Legal | pre-M25 | Counsel |

**Rule:** Do not mark production-ready without repository evidence.
