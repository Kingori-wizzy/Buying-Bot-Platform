# Post-deployment smoke test

## Command

```bash
export BUYINGBOT_ENV_FILE=/etc/buyingbot/env.production
pnpm run production:smoke
# or
node scripts/deployment/post-deploy-smoke.mjs --env-file /etc/buyingbot/env.production
```

`deploy-production.sh` runs this automatically after health wait.

## Checks

| Check                       | Pass condition                                                |
| --------------------------- | ------------------------------------------------------------- |
| API `/health/live`          | HTTP 2xx                                                      |
| API `/health/ready`         | HTTP 2xx (database reachable)                                 |
| `GET /v1/products`          | HTTP 2xx                                                      |
| `GET /v1/search/products`   | HTTP 2xx                                                      |
| Storefront `PUBLIC_WEB_URL` | Optional until DNS/TLS exist (`BLOCKED` if unreachable)       |
| Admin `PUBLIC_ADMIN_URL`    | Optional until DNS/TLS exist                                  |
| Escrow live payment         | **Not executed** by smoke; fail-closed is OK when keys absent |

Secrets are never printed.

## Manual follow-up (human)

1. Admin login
2. Create/publish a product with image
3. Storefront product page shows image + server price
4. Register + cart + checkout (expect `ESCROW_NOT_CONFIGURED` until company keys)
5. Admin orders list shows the order
