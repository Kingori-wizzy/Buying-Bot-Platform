# `infrastructure/scripts`

## Purpose

Home for **operational and automation helper scripts** used by humans or CI to bootstrap, validate, or operate infrastructure—not application business logic.

## Folder structure

| Path         | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `bootstrap/` | One-time or rare environment bootstrap helpers                          |
| `ci/`        | Scripts invoked from GitHub Actions or other CI for infra checks        |
| `ops/`       | Day-2 operations helpers (drain, backup trigger wrappers, smoke checks) |

## What belongs here

- Shell/Python/TS utility scripts (when authored)
- Idempotent ops helpers with clear `--help` / usage docs
- Wrappers that call cloud/k8s CLIs safely

## What does not belong here

- App feature scripts that belong in `apps/*`
- Scripts embedding secrets or long-lived credentials
- Ad-hoc unreviewed production mutation tools without ownership docs
