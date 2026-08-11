# `infrastructure/docker`

## Purpose

Home for **container packaging** of platform deployables: base images, per-app Docker build contexts, and Compose files for local or ephemeral stacks.

## Folder structure

| Path       | Purpose                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| `base/`    | Shared base image definitions (runtime, build toolchain) reused by apps     |
| `apps/`    | Per-application Docker packaging (`web`, `admin`, `api`, `ai`, `worker`, …) |
| `compose/` | Compose project files for local multi-service orchestration                 |

## What belongs here

- Dockerfiles and `.dockerignore` (when authored)
- Image build arguments documentation
- Compose networks/volumes layouts for non-prod local use

## What does not belong here

- Application source (stays in `apps/` / `packages/`)
- Kubernetes runtime manifests (see `../kubernetes/`)
- Cloud provisioning (see `../terraform/`)
