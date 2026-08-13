# Disaster recovery design

**Aligns with:** ADR-0006, 0019; `docs/Deployment/disaster-recovery.md`

## Targets (foundation — existing)

| Metric | Target | Status |
| --- | --- | --- |
| RPO | ≤ 24 hours | Documented; NOT VERIFIED by restore drill |
| RTO | ≤ 4 hours | Documented; NOT VERIFIED |

Before production payments: tighten RPO/RTO and **mandatory restore drills**.

## Recovery priority

1. PostgreSQL (orders, payments, inventory, identity, audit)  
2. Object storage (reconcile keys)  
3. Rebuild FTS/pgvector/search  
4. Redis cold; outbox replay  
5. Redeploy apps from known images  

## Scenarios

Process crash, bad deploy, config error, PG/Redis/provider outage,
credential compromise — detection via health/alerts; recovery per runbooks
(to be expanded in ops docs during M19–M22).
