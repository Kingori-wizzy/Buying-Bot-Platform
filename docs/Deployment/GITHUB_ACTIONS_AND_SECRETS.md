# GitHub Actions and GitHub Secrets

**Preferred CI/CD and secret management:** GitHub Actions + GitHub Secrets / Environments.  
Vault is not part of this architecture.

## Workflows

| Workflow          | File                                      | Purpose                                                                                              |
| ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CI                | `.github/workflows/ci.yml`                | Install, secret scan, migrate, lint, typecheck, test, integrity, smoke, e2e API, audit, Docker build |
| Staging deploy    | `.github/workflows/staging-deploy.yml`    | Build/push GHCR; optional SSH when staging secrets set                                               |
| Production deploy | `.github/workflows/production-deploy.yml` | **Manual only** (`workflow_dispatch`) against protected `production` environment                     |

## Required repository / environment secrets

### Staging (`staging` environment or repo secrets)

| Secret                 | Purpose                      |
| ---------------------- | ---------------------------- |
| `STAGING_SSH_HOST`     | Staging VPS hostname/IP      |
| `STAGING_SSH_USER`     | SSH user                     |
| `STAGING_SSH_KEY`      | Private key material         |
| `STAGING_COMPOSE_PATH` | Optional remote compose path |

### Production (`production` environment — protect with required reviewers)

| Secret                    | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `PRODUCTION_SSH_HOST`     | Hostinger VPS hostname/IP                                         |
| `PRODUCTION_SSH_USER`     | SSH user                                                          |
| `PRODUCTION_SSH_KEY`      | Deploy key (least privilege)                                      |
| `PRODUCTION_COMPOSE_PATH` | Remote path to repo / compose project                             |
| `PRODUCTION_ENV_FILE`     | Remote path to env file (default `/etc/buyingbot/env.production`) |

**Never store Escrow/AI/SMTP secrets in GitHub unless the deploy job needs to write the VPS env file.** Prefer creating `/etc/buyingbot/env.production` once on the VPS with `chmod 600`.

## Exact runtime secrets (VPS env file — not committed)

Documented in `.env.production.example`:

- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`
- `SESSION_SECRET`, `SERVICE_JWT_SECRET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `CORS_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL`, public URLs
- `ESCROW_*` only when enabling payments
- `OPENAI_API_KEY` / `SMTP_URL` / SMS tokens only when enabling those features

Do not invent values. Leave Escrow blank until the company issues credentials.

## Protected production gate

1. Create GitHub Environment named `production`
2. Enable required reviewers
3. Restrict deployment branches to `main` (or release tags)
4. Run **Production deploy** workflow manually after VPS bootstrap
