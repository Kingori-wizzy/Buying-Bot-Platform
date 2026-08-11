# Versioning strategy

**Aligns with:** [ARCHITECTURE.md](../ARCHITECTURE.md) §6 Delivery architecture, [ADR-0003](../adr/0003-conventional-commits-quality-gates.md)

## Scheme

The platform uses **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`).

| Bump      | When                                           | Conventional Commit signal            |
| --------- | ---------------------------------------------- | ------------------------------------- |
| **MAJOR** | Breaking change to a published public contract | `BREAKING CHANGE:` footer or `type!:` |
| **MINOR** | Backward-compatible feature                    | `feat:`                               |
| **PATCH** | Backward-compatible fix                        | `fix:`                                |

Other types (`docs`, `chore`, `refactor`, `test`, `ci`, `build`, `style`, `perf`) do not bump version by themselves unless they alter a published contract (document via `BREAKING CHANGE` if so).

## Monorepo versioning model

### Phase 1 (current)

- Repository root remains `0.0.0` / private while the foundation is established.
- No public npm packages are published yet.
- Git tags are optional until the first releasable app exists.

### When apps ship

Use **independent versioning per deployable** (recommended default):

| Artifact                              | Versioned as   | Example tag                   |
| ------------------------------------- | -------------- | ----------------------------- |
| Customer Website                      | app release    | `web@1.4.0`                   |
| Admin Dashboard                       | app release    | `admin@1.2.0`                 |
| Backend API                           | app release    | `api@2.0.0`                   |
| AI Service                            | app release    | `ai@1.1.0`                    |
| Worker                                | app release    | `worker@1.0.3`                |
| Shared publishable libraries (if any) | package SemVer | `@buying-bot/contracts@3.1.0` |

Private config packages (`typescript-config`, `eslint-config`, `prettier-config`) stay `0.0.0` and are consumed via `workspace:*` only.

Lockstep “platform version” tags (`v1.0.0`) may be added later for compliance snapshots; they do not replace per-app versions.

## Changelog

- Maintain human-readable notes from Conventional Commits (tooling such as Changesets or release-please may be adopted via ADR).
- User-facing breaking changes must be called out explicitly in the PR and release notes.

## Dependency versioning

- Application dependencies follow Dependabot PRs and SemVer ranges in manifests.
- CI installs with `pnpm install --frozen-lockfile`; the lockfile is the source of truth for reproducible builds.

## Pre-release channels (future)

When needed: `X.Y.Z-alpha.N`, `X.Y.Z-beta.N`, `X.Y.Z-rc.N` for staged rollouts. Introduce via ADR before first use.
