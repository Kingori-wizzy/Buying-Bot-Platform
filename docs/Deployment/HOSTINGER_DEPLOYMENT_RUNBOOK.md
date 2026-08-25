# Hostinger VPS deployment runbook

**Authoritative Hostinger operator document.** Other Hostinger/VPS reports in `docs/project/` are superseded.

Classification of the software package: **CONDITIONALLY PRODUCTION READY**. Live go-live remains gated on EXTERNAL DNS, TLS, Escrow credentials, and company catalog data.

## 1. VPS requirements

- Ubuntu 22.04/24.04 (or equivalent)
- 4+ GB RAM recommended (8 GB preferred with MinIO + Postgres + Next)
- 40+ GB disk
- Public IPv4
- Ports 22, 80, 443 reachable after UFW

## 2. SSH setup

```bash
adduser deploy
usermod -aG docker deploy   # after Docker install
# Disable password SSH after key login works (sshd_config)
```

Do not close the only SSH session until key login is verified. Keep port 22 open.

## 3. Docker installation

Install Docker Engine + Compose plugin from Docker’s official docs. Confirm:

```bash
docker --version
docker compose version
```

## 4. UFW setup

See [FIREWALL.md](./FIREWALL.md). Allow 22/80/443 only. Do **not** publish Postgres, Redis, or MinIO on the host.

## 5. Repository deployment

```bash
sudo mkdir -p /opt/buyingbot
sudo chown deploy:deploy /opt/buyingbot
cd /opt/buyingbot
git clone <COMPANY_REPO_URL> .
```

## 6. Production environment setup

```bash
sudo mkdir -p /etc/buyingbot
sudo cp .env.production.example /etc/buyingbot/env.production
sudo chmod 600 /etc/buyingbot/env.production
sudo editor /etc/buyingbot/env.production
```

Fill placeholders only (never commit this file). Required keys are listed in `.env.production.example` and [GITHUB_ACTIONS_AND_SECRETS.md](./GITHUB_ACTIONS_AND_SECRETS.md).

Keep:

- `PAYMENTS_ENABLED=false` until Escrow credentials exist
- `PAYMENT_PROVIDER=escrow`
- `MPESA_ENABLED=false`
- `MARKETPLACE_INGESTION_ENABLED=false`
- `COOKIE_SECURE=true`
- explicit `CORS_ORIGIN` (no `*`)

Optional generator:

```bash
BOOTSTRAP_INFRA_PASSWORD='<uncommitted>' node scripts/deployment/bootstrap-env.mjs
```

## 7. GitHub Actions deployment

1. Create GitHub Environment `production` with required reviewers
2. Set `PRODUCTION_SSH_HOST`, `PRODUCTION_SSH_USER`, `PRODUCTION_SSH_KEY`, `PRODUCTION_COMPOSE_PATH`
3. Run workflow **Production deploy** with confirmation `deploy-production`

Manual VPS deploy (same script):

```bash
export BUYINGBOT_ENV_FILE=/etc/buyingbot/env.production
bash scripts/deployment/deploy-production.sh /etc/buyingbot/env.production
```

## 8. PostgreSQL migration

Compose `migrate` service runs `prisma migrate deploy` (forward-only). Never auto-drop production data.

## 9. MinIO initialization

`minio-init` creates the media bucket. API uses `MEDIA_DRIVER=s3` + `S3_ENDPOINT=http://minio:9000`.

## 10. Nginx configuration

Production compose fronts web/admin/API via nginx. Public ports: 80/443 only.

## 11. Cloudflare DNS

Create A/AAAA records for shop, admin, and API hostnames → VPS IP. Enable proxy only after TLS is understood (orange-cloud vs grey-cloud for ACME).

## 12. TLS

See [TLS_SETUP.md](./TLS_SETUP.md). Certificates are EXTERNAL until domains exist.

## 13. Application startup

`deploy-production.sh` builds images, starts postgres/redis/minio, migrates, then starts apps with `restart: unless-stopped` so the stack survives VPS reboot.

## 14. Health verification

```bash
node scripts/deployment/production-preflight.mjs --env-file /etc/buyingbot/env.production --live
node scripts/deployment/post-deploy-smoke.mjs --env-file /etc/buyingbot/env.production
curl -sf https://api.example.com/health/live
```

Replace hostnames with the company’s domains.

## 15. Admin creation + customer auth

API boot **idempotently seeds** the platform organization and roles (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`). Prisma migrate must have succeeded first.

**Customers** self-register and log in on the storefront (`/register`, `/login`). Password minimum length is **10**. Ensure `CORS_ORIGIN` matches the exact HTTPS shop origin and `COOKIE_SECURE=true` under HTTPS.

**First admin** (unique production password — never reuse `LocalAdmin1!`):

```bash
cd /opt/buyingbot
export DATABASE_URL='postgresql://buyingbot:…@127.0.0.1:5432/buyingbot?schema=public'
# Prefer connecting via compose network / documented ops tunnel — do not publish Postgres publicly.
ADMIN_EMAIL='ops@your-company.com'
ADMIN_PASSWORD='…at-least-12-chars…'
API_BASE_URL='https://buybot.staging.earnhub.com'
ADMIN_ORIGIN='https://buybot.staging.earnhub.com'
node scripts/deployment/create-admin.mjs
```

Then open `https://buybot.staging.earnhub.com/admin/login` (path-based nginx) and sign in with `realm=admin`.

If CORS or cookies fail: confirm `CORS_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL`, and `PUBLIC_*` URLs all use the same public hostname scheme (`https://…`).

## 16. Backup configuration

See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md). Schedule daily Postgres dumps off-box. Encrypt with `age` when `BACKUP_AGE_RECIPIENT` is set.

**RPO target:** ≤ 24 hours (daily dumps) until PITR is purchased.  
**RTO target:** hours-scale restore of dump + media mirror — **not verified on Hostinger until a restore drill is executed**.

## 17. Restore procedure

[BACKUP_RESTORE.md](./BACKUP_RESTORE.md) — never restore onto production without change control.

## 18. Rollback

[ROLLBACK.md](./ROLLBACK.md) and [runbooks/ROLLBACK_RUNBOOK.md](./runbooks/ROLLBACK_RUNBOOK.md): revert git/image, keep DB forward-only unless restoring a dump.

## 19. Troubleshooting

| Symptom              | Check                                                    |
| -------------------- | -------------------------------------------------------- |
| API not ready        | `docker compose logs api migrate postgres`               |
| Payments stay unpaid | Escrow credentials / webhook HMAC / `PAYMENTS_ENABLED`   |
| Images missing       | MinIO health, `MEDIA_PUBLIC_BASE_URL`, nginx `/v1/media` |
| Empty shop           | Expected until admin publishes ACTIVE products           |
| CORS errors          | `CORS_ORIGIN` must list exact shop + admin HTTPS origins |

## Explicit non-claims

This runbook does not prove live Escrow money movement, issued TLS certs, or company catalog inventory.
