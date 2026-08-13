# Release notes — 0.1.0-rc.2

**Date:** 2026-08-13  
**Version:** `0.1.0-rc.2`  
**Classification:** **CONDITIONALLY PRODUCTION READY**

## Why this RC

Closes locally actionable gaps after M25: stronger smoke/integrity/security gates,
AI graceful degradation (503), production env template, ops launch sequence, gap matrix.

## Verification (this RC)

| Command                                      | Result                             |
| -------------------------------------------- | ---------------------------------- |
| `pnpm run verify`                            | PASS                               |
| `pnpm run security:gate`                     | PASS                               |
| `pnpm run integrity`                         | PASS                               |
| `SMOKE_REQUIRE=1 pnpm run smoke` (local API) | PASS (AI 503 when ai-service down) |

## Still EXTERNAL (not claimed PASS)

See `docs/project/EXTERNAL_PREREQUISITES.md` and `docs/project/GAP_MATRIX_STAGING_PRODUCTION.md`.

Do **not** set `PAYMENTS_ENABLED=true` in production until live M-Pesa + TLS + secrets manager + legal gates are complete.
