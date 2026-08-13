# Changelog

All notable changes to Buying Bot Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **M24:** Production readiness report, RTM verification, security audit,
  compliance readiness, performance/reliability validation notes, expanded
  runbooks, restore-drill evidence path.
- **M25:** Production architecture, launch checklist, EXTERNAL prerequisites,
  final implementation report; documentation baseline pointers updated.

## [0.1.0-rc.2] — 2026-08-13

### Added

- Expanded staging smoke (CSRF, register/login, cart, AI degradation, CSRF negative).
- Expanded integrity checks (`on_hand >= reserved`, cart orphans, session token uniqueness).
- `pnpm run security:gate` static security gate + `pnpm run preflight`.
- `.env.production.example`, production Compose notes, Operations launch smoke sequence,
  alert definitions, staging→production gap matrix.

### Fixed

- API returns `503 AI_SERVICE_UNAVAILABLE` when AI service is unreachable (commerce continues).

### Changed

- Root / VERSION bumped to `0.1.0-rc.2`.

## [0.1.0-rc.1] — 2026-08-13

### Added

- **M0–M5:** Documentation baseline, NestJS+Fastify API shell, Prisma/PostgreSQL,
  identity AuthN/AuthZ (sessions, RBAC, admin MFA).
- **M6–M12:** Catalog, inventory, pricing engine, cart, checkout/orders,
  M-Pesa payment adapter (sandbox-ready), webhooks/outbox/reconcile.
- **M13–M14:** Next.js storefront (`apps/web`) and admin portal (`apps/admin`).
- **M15–M18:** AI service + RAG + commerce tools + async notifications.
- **M19–M22:** Observability seams, security hardening, k6 scripts, DR backup/
  restore scripts and runbooks.
- **M23:** Staging Compose stack, nginx reverse proxy, web/admin Dockerfiles
  (standalone), smoke + integrity scripts, Playwright e2e foundation,
  GHCR staging workflow (`workflow_dispatch` / `v*` tags), RC artifacts
  (`VERSION`, release notes, build metadata generator).

### Changed

- Root package version set to `0.1.0-rc.1`.
- CI quality job boots API for deterministic smoke + integrity after migrate.

### Security

- Staging/production env guards remain (no wildcard CORS, secrets required).
- Staging deploy does **not** auto-promote to production hosts.

### Notes

- Live M-Pesa, DNS/TLS, Vault, pen-test, and legal approvals remain
  **EXTERNAL** prerequisites (see `docs/project/EXTERNAL_PREREQUISITES.md`).

[0.1.0-rc.1]: https://github.com/buying-bot/buying-bot-platform/releases/tag/v0.1.0-rc.1
