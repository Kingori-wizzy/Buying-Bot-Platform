# Production launch checklist (M25)

**Target version:** 0.1.0 (launch packaging; current RC `0.1.0-rc.2`)  
**Classification gate:** CONDITIONALLY PRODUCTION READY until EXTERNAL items clear.

## Technical

- [x] `pnpm run verify` green (except transitive `audit:deps` — Prisma upstream)
- [x] `pnpm run security:gate` green
- [x] Migrations deploy path (`migrate:deploy`)
- [x] Integrity script (expanded)
- [x] API smoke script (expanded; AI 503 degradation)
- [x] Journey validation through checkout (`scripts/dev/journey-validation.mjs`)
- [x] Playwright API + browser page load (`e2e/customer-purchase-flow.spec.ts`)
- [x] Sandbox webhook → PAID/PROCESSING (not live Escrow)
- [x] `pnpm audit --audit-level=high` clean (`deepmerge-ts` override)
- [x] Staging compose + nginx
- [x] Dockerfiles for api/web/admin
- [x] Security regressions (CORS/CSRF)
- [x] Production env template (`.env.production.example`)
- [ ] Staging host provisioned (EXTERNAL)
- [ ] TLS certs on staging/prod edge (EXTERNAL)
- [ ] Secrets in GitHub Environment + `/etc/buyingbot/env.production` (EXTERNAL operator)
- [ ] Live Escrow keys + webhook URL (EXTERNAL)
- [ ] Object storage credentials on VPS MinIO (operator)
- [ ] OTel collector + alerts (EXTERNAL)
- [ ] Pen-test sign-off (EXTERNAL)

## Business

- [ ] Legal ToS / privacy (EXTERNAL)
- [ ] Tax rates approved (EXTERNAL)
- [ ] Support / refund policy (EXTERNAL)
- [ ] Merchant / Escrow contracts (EXTERNAL)

## Operational

- [x] Runbooks under `docs/Deployment/runbooks/` (+ `docs/Operations/` index)
- [x] DR backup scripts + restore drill evidence
- [x] Launch smoke sequence documented
- [ ] On-call roster (EXTERNAL)
- [ ] Status page (EXTERNAL)
- [ ] Launch war-room schedule (EXTERNAL)

## Go / no-go

Do **not** enable `PAYMENTS_ENABLED=true` in production until Technical EXTERNAL
payment + TLS + secrets manager items are complete and signed.
