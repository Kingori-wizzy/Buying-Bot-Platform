# `infrastructure/docker`

## Purpose

Home for **container packaging** of platform deployables: base images, per-app Docker build contexts, and Compose files for local or ephemeral stacks.

## Folder structure

| Path       | Purpose                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| `base/`    | Shared base image definitions (runtime, build toolchain) reused by apps             |
| `apps/`    | Per-application Docker packaging (`web`, `admin`, `api`, `ai-service`, `worker`, …) |
| `compose/` | Compose project files for local multi-service orchestration                         |

## Current foundation

- `base/Dockerfile.node` — multi-stage, non-root Node 22 image for `api` / `worker` / `ai-service`
- `apps/Dockerfile.web` / `apps/Dockerfile.admin` — Next.js standalone multi-stage images
- `compose/docker-compose.yml` — local Postgres 16, Redis 7, and ops/API services
- `compose/docker-compose.staging.yml` — staging stack (separate volumes/network + nginx)
- Host Postgres ports: local **5433**, staging **5434**
- Root `.dockerignore` — keeps secrets and caches out of build context

Build example (from **repository root**):

```bash
docker compose -f infrastructure/docker/compose/docker-compose.yml build api
docker compose -f infrastructure/docker/compose/docker-compose.staging.yml --env-file .env.staging up -d --build
# or
docker build -f infrastructure/docker/base/Dockerfile.node --build-arg APP_NAME=api -t buying-bot-api .
docker build -f infrastructure/docker/apps/Dockerfile.web -t buying-bot-web .
```

EXTERNAL: full Next standalone builds can be heavy; prefer CI/GHCR images on shared hosts.

## What does not belong here

- Application source (stays in `apps/` / `packages/`)
- Kubernetes as v1 runtime (ADR-0019 Compose-first; see `../kubernetes/` placeholders only)
- Cloud provisioning (see `../terraform/`)
