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
- `compose/docker-compose.yml` — local ops-shell stack
- Root `.dockerignore` — keeps secrets and caches out of build context

Build example:

```bash
docker build -f infrastructure/docker/base/Dockerfile.node --build-arg APP_NAME=api -t buying-bot-api .
```

## What does not belong here

- Application source (stays in `apps/` / `packages/`)
- Kubernetes runtime manifests (see `../kubernetes/`)
- Cloud provisioning (see `../terraform/`)
