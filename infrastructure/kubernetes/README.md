# `infrastructure/kubernetes`

## Purpose

Home for **Kubernetes deployment structure**: shared bases, per-app workloads, and environment-specific overlays (dev / staging / production).

## Folder structure

| Path                   | Purpose                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `base/`                | Cluster-wide or shared resources (namespaces patterns, common labels, base policies) |
| `apps/`                | Per-deployable workload definitions (Deployments/Services stubs when authored)       |
| `overlays/dev/`        | Dev environment patches and values                                                   |
| `overlays/staging/`    | Staging environment patches and values                                               |
| `overlays/production/` | Production environment patches and values                                            |
| `policies/`            | NetworkPolicies, PodSecurity, ResourceQuotas, and related guardrails                 |

## What belongs here

- Manifests or Kustomize/Helm charts (when authored)
- Environment overlays and production hardening diffs
- Workload identity / service account bindings (non-secret)

## What does not belong here

- Image build definitions (see `../docker/`)
- Cloud VPC/cluster provisioning (see `../terraform/`)
- Raw secrets or kubeconfig files
