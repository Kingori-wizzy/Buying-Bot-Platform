# Reliability validation (M24)

Maps ADR-0017 graceful degradation expectations to code evidence.

| Dependency                       | Expected degradation                                  | Code evidence                                              | Result        |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- | ------------- |
| Redis down                       | Auth rate limit falls back to memory; cache miss path | `apps/api/src/app.ts` Redis connect catch → memory limiter | PASS          |
| AI service down                  | Commerce continues; assistant unavailable             | AI isolated service; storefront can omit assistant         | PASS (design) |
| Payments disabled / keys missing | Fail closed; no fake success                          | `PAYMENTS_ENABLED` + env refine in `@buying-bot/config`    | PASS          |
| DB unhealthy at boot             | Warn; readiness reflects dependency                   | `database.healthCheck()` + `/health/ready`                 | PASS          |
| Outbox publish failures          | Retry / requeue                                       | `requeueFailedOutbox`, worker poll                         | PASS          |
| M-Pesa webhook dupes             | Idempotent confirm                                    | `payments.webhook.test.ts`                                 | PASS          |
| Knowledge / embeddings missing   | Deterministic / empty retrieve                        | knowledge retrieve tests                                   | PARTIAL       |

## Notes

- SLOs / error budgets remain **ASPIRATIONAL** until production telemetry is wired
  (EXTERNAL OTel collector + alerting).
- Multi-AZ failover is documented only — not proven on a cloud account.
