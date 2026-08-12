# Disaster recovery baseline

**Status:** Documented baseline — restore drills NOT VERIFIED  
**Aligns with:** [PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

## Objectives (initial targets)

| Metric | Target (foundation) | Notes                                                      |
| ------ | ------------------- | ---------------------------------------------------------- |
| RPO    | ≤ 24 hours          | Until automated PostgreSQL PITR is implemented             |
| RTO    | ≤ 4 hours           | Manual redeploy of Node services from `main` / prior image |

These targets must be revisited when Postgres, Redis, and queues are introduced.

## Failure scenarios

| Scenario                            | Detection                              | Recovery                                                      |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| Application process crash           | Container healthcheck / `/health/live` | Orchestrator restart; investigate logs                        |
| Bad deploy                          | Failed CI or rising 5xx                | Rollback to previous image tag / git revert                   |
| Config error                        | Process exits on `ConfigError`         | Restore last known good env; restart                          |
| Dependency outage (future DB/Redis) | Readiness 503                          | Keep liveness up; fix dependency; avoid traffic via readiness |
| Credential compromise               | Security report / anomaly              | Rotate secrets; revoke tokens; audit access                   |
| Region/cloud outage                 | Provider status                        | Redeploy to alternate region (IaC not yet implemented)        |

## Backups (future data plane)

When PostgreSQL is introduced:

1. Automated daily backups + PITR
2. Encrypted at rest
3. Retention ≥ 30 days
4. Quarterly restore drill (mandatory before production data)

**Current status:** No production datastore is wired. Backup drills are NOT VERIFIED.

## Redis / queues

Redis is cache/queue only — never sole source of truth for orders, payments, or inventory.

## Contacts

Follow [SECURITY.md](../../SECURITY.md) for security incidents.
