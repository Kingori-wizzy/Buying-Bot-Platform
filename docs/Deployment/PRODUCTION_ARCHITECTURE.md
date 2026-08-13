# Production architecture (Compose-first)

**Authority:** ADR-0019 — Compose / single-node first; **no Kubernetes** in v1.

## Topology

```text
                    [ EXTERNAL: CDN / WAF / DNS / TLS ]
                                    |
                              +-----+-----+
                              |   nginx   |  (TLS terminate when certs EXTERNAL)
                              +--+--+--+--+
                     /           |     |      \
                    v            v     v       v
                 web          admin   api    ai-service
               (Next)        (Next)  (Nest)  (Fastify)
                                    |
                     +--------------+--------------+
                     |                             |
                 postgres(+pgvector)             redis
                     ^
                  worker (outbox, reservations, notifications)
```

```mermaid
flowchart TB
  edge["EXTERNAL CDN/WAF/DNS/TLS"]
  nginx["nginx reverse proxy"]
  web["web Next.js"]
  admin["admin Next.js"]
  api["api Nest+Fastify"]
  ai["ai-service"]
  worker["worker"]
  pg["PostgreSQL + pgvector"]
  redis["Redis"]

  edge --> nginx
  nginx --> web
  nginx --> admin
  nginx --> api
  nginx --> ai
  api --> pg
  api --> redis
  worker --> pg
  worker --> redis
  ai --> api
```

## Routing (staging nginx)

| Path                                   | Upstream        |
| -------------------------------------- | --------------- |
| `/`                                    | web:3001        |
| `/admin/`                              | admin:3004      |
| `/v1/`, `/api/`, `/health`, `/metrics` | api:3000        |
| `/ai/`                                 | ai-service:3003 |

## Deployables

Images: `buying-bot-api`, `buying-bot-worker`, `buying-bot-ai-service`,
`buying-bot-web`, `buying-bot-admin` (GHCR via staging workflow).

Compose files:

- Local deps/apps: `infrastructure/docker/compose/docker-compose.yml`
- Staging: `infrastructure/docker/compose/docker-compose.staging.yml`

## Explicitly out of scope (v1)

- Kubernetes manifests as runtime (folders may exist as placeholders only)
- Multi-region active-active
- Invented cloud account / DNS / SSL details
