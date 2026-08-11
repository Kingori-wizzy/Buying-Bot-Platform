# `infrastructure/nginx`

## Purpose

Home for **edge and reverse-proxy configuration** used in front of platform services (TLS termination patterns, routing, compression, security headers—when authored).

## Folder structure

| Path         | Purpose                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| `conf.d/`    | Server/location snippets included by the main nginx config                |
| `templates/` | Environment-parameterized config templates (e.g. rendered at deploy time) |
| `snippets/`  | Reusable fragments (headers, TLS, proxy presets)                          |

## What belongs here

- `nginx.conf` fragments and site configs (when authored)
- Routing maps for web/admin/API ingress patterns
- Non-secret upstream naming conventions

## What does not belong here

- TLS private keys or certificate bodies
- Application code
- Cloud load-balancer provisioning (see `../terraform/`)
