# Release notes — 0.1.0-rc.3

**Date:** 2026-08-18  
**Version:** `0.1.0-rc.3`  
**Classification:** **CONDITIONALLY PRODUCTION READY**

## Why this RC

Closes remaining locally actionable production gaps after rc.2: payment outbox
worker, sandbox webhook → PAID journey, AI SSE storefront client, catalog offer
serialization, IDOR on customer orders, late-payment reconciliation hold, and
the Prisma transitive `deepmerge-ts` audit override.

## Verification (this RC)

See `docs/project/FINAL_PRODUCTION_VERIFICATION_REPORT.md`.

## Still EXTERNAL (not claimed PASS)

Live M-Pesa, DNS/TLS, notification vendors, pen-test, legal ToS, staging SLO
measurement. Sandbox webhook success is **not** live Daraja verification.

Do **not** set `PAYMENTS_ENABLED=true` until live M-Pesa + TLS + secrets manager

- legal gates are complete.
