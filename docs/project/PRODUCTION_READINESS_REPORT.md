# Production readiness report

**Date:** 2026-08-13  
**Scope:** Buying Bot Platform engineering (Compose-first, ADR-0019)  
**Release:** `0.1.0-rc.2`  
**Authority:** Code + CI + local compose evidence — no invented EXTERNAL vendor verification  
**Classification:** **CONDITIONALLY PRODUCTION READY**

## Scorecard

| Domain        | Result       | Evidence / notes                                                             |
| ------------- | ------------ | ---------------------------------------------------------------------------- |
| Architecture  | PASS         | ADR-0005–0020; Nest+Fastify; AI isolated from Prisma                         |
| Security      | PARTIAL      | CSRF/CORS/MFA/Helmet/gitleaks/`security:gate`; BLOCKED: pen-test, Vault, WAF |
| Reliability   | PARTIAL      | Health/ready, outbox recover, AI→503; SLOs ASPIRATIONAL                      |
| Testing       | PASS         | Unit/integration + integrity + expanded API smoke                            |
| CI/CD         | PASS         | quality + docker-build; staging-deploy push-only without SSH secrets         |
| Observability | PARTIAL      | `/metrics`, alert definitions; alerting stack EXTERNAL                       |
| Performance   | BLOCKED      | k6 scripts present; measured run needs staging URL                           |
| Scalability   | PARTIAL      | Stateless design; no multi-node proof                                        |
| Database      | PASS         | Migrations; pgvector; expanded integrity SQL                                 |
| AI            | PARTIAL      | Tools + tests; vendor keys EXTERNAL; unavailable→503                         |
| Payments      | PARTIAL      | Adapter + webhook tests; live keys EXTERNAL                                  |
| DR            | PASS (local) | M24 restore drill VERIFIED                                                   |
| Documentation | PASS         | ADRs, runbooks, EXTERNAL prerequisites, gap matrix                           |
| Operations    | PARTIAL      | Runbooks + launch smoke; on-call EXTERNAL                                    |

### Evidence commands

```bash
pnpm run verify
pnpm run security:gate
pnpm run migrate:deploy
pnpm run integrity
API_BASE_URL=http://127.0.0.1:3000 SMOKE_REQUIRE=1 pnpm run smoke
pnpm run release:metadata
```

## Go / no-go

| Gate                               | Status                  |
| ---------------------------------- | ----------------------- |
| Critical engineering defects known | None identified in rc.2 |
| External staging host + DNS/TLS    | BLOCKED (EXTERNAL)      |
| Live payment + legal               | BLOCKED (EXTERNAL)      |
| Pen-test / Vault                   | BLOCKED (EXTERNAL)      |

**Decision:** CONDITIONALLY PRODUCTION READY — may enter monitored staging once
EXTERNAL host/TLS/secrets exist; **not** full PRODUCTION READY for live money.
