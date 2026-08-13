# Post-deployment launch smoke sequence

Execute in order after staging/production deploy. Record PASS/FAIL/BLOCKED.

| #   | Step                | Command / action                                    | Expected                        |
| --- | ------------------- | --------------------------------------------------- | ------------------------------- |
| 1   | Homepage            | `GET https://<web-host>/`                           | 200 HTML                        |
| 2   | Auth register/login | `pnpm run smoke` with `API_BASE_URL`                | Smoke OK                        |
| 3   | Admin               | Open `/login` on admin host; MFA enroll if required | Login UX reachable              |
| 4   | Catalog             | `GET /v1/products`                                  | 200                             |
| 5   | Search              | `GET /v1/search/products?q=test`                    | 200                             |
| 6   | PDP                 | `GET /v1/products/<slug>`                           | 200 or 404 for missing          |
| 7   | Cart                | `GET /v1/cart` with session                         | 200                             |
| 8   | Checkout            | `POST /v1/checkout` + Idempotency-Key               | 201 PENDING_PAYMENT when seeded |
| 9   | Payment             | EXTERNAL if `PAYMENTS_ENABLED=false`                | BLOCKED until keys              |
| 10  | Webhook             | Replay fixture with valid signature in sandbox      | Idempotent 2xx                  |
| 11  | Order               | `GET /v1/orders/:id`                                | Ownership enforced              |
| 12  | Inventory           | Admin adjust + integrity                            | `pnpm run integrity` PASS       |
| 13  | AI                  | `POST /v1/ai/chat`                                  | 200/401/503 acceptable shapes   |
| 14  | Notifications       | Worker logs intent processing                       | No crash loop                   |
| 15  | Monitoring          | `GET /metrics` on api/ai/worker                     | Prometheus text                 |
| 16  | Logs                | Structured JSON with requestId                      | No secrets                      |
| 17  | Backups             | `infrastructure/scripts/backup-postgres.*`          | Dump file created               |

**Hard stop:** Do not enable live payments until EXTERNAL payment + TLS + secrets manager items in `docs/project/EXTERNAL_PREREQUISITES.md` are complete.
