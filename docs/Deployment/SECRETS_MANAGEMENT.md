# Secrets Management

**Authoritative secret stores:** GitHub Actions secrets / Environments for CI/CD, and a root-only env file on the Hostinger VPS for Compose runtime.

**Do not use HashiCorp Vault** for the current production architecture.

## Runtime (Hostinger VPS)

```text
/etc/buyingbot/env.production   # chmod 600, root:root
        │
        ├── docker compose --env-file
        ├── API / worker / ai / web / admin
        └── never copied into Git or NEXT_PUBLIC_* bundles
```

## CI/CD (GitHub)

| Scope                    | Use                                                                    |
| ------------------------ | ---------------------------------------------------------------------- |
| Repository secrets       | Shared non-production values (e.g. staging SSH)                        |
| Environment `production` | Production deploy secrets — requires protected environment + reviewers |
| Environment `staging`    | Staging host deploy                                                    |

See [GITHUB_ACTIONS_AND_SECRETS.md](./GITHUB_ACTIONS_AND_SECRETS.md).

## Rules

1. Never commit `.env.production` or real `.env`
2. Never put secrets in Dockerfiles or `NEXT_PUBLIC_*`
3. Generate with `openssl rand -base64 48`
4. Rotate `SESSION_SECRET` carefully (invalidates sessions)
5. Escrow / SMTP / AI keys are EXTERNAL — leave blank until issued; keep `PAYMENTS_ENABLED=false`
6. Keep `MARKETPLACE_INGESTION_ENABLED=false` and `MPESA_ENABLED=false` in production

## Preflight

```bash
node scripts/deployment/production-preflight.mjs --env-file /etc/buyingbot/env.production
```
