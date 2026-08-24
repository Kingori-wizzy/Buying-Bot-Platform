# Production Docker Compose (Hostinger VPS)

**ADR-0019:** Compose-first. Do **not** put real secrets in this file.

```bash
sudo cp .env.production.example /etc/buyingbot/env.production
sudo chmod 600 /etc/buyingbot/env.production
# fill secrets…
bash scripts/vps/preflight.sh /etc/buyingbot/env.production

docker compose -f infrastructure/docker/compose/docker-compose.production.yml \
  --env-file /etc/buyingbot/env.production up -d --build
```

| Concern        | Production                                           |
| -------------- | ---------------------------------------------------- |
| `NODE_ENV`     | `production`                                         |
| Secrets        | `/etc/buyingbot/env.production` (not Git)            |
| Payments       | Escrow; `PAYMENTS_ENABLED=false` until EXTERNAL keys |
| M-Pesa CX      | Disabled                                             |
| Object storage | MinIO (`MEDIA_DRIVER=s3`)                            |
| TLS            | Nginx + Let's Encrypt mount                          |
| DB ports       | **Not** published                                    |
| Seeds          | Never run staging seed in production                 |

Staging topology remains `docker-compose.staging.yml` for non-prod.
