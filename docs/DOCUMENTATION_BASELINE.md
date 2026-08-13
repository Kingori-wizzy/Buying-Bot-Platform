# Documentation baseline index

**Status:** M0–M25 documentation baseline (2026-08-13)  
**Authority:** Accepted ADRs (0005–0020) > design/requirements docs  
**Classification:** CONDITIONALLY PRODUCTION READY

| Layer                  | Location                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture decisions | [adr/](./adr/), [DECISIONS.md](./DECISIONS.md), [ARCHITECTURE_DECISION_MATRIX.md](./ARCHITECTURE_DECISION_MATRIX.md)                                                   |
| Requirements           | [requirements/](./requirements/)                                                                                                                                       |
| Design                 | [design/](./design/)                                                                                                                                                   |
| Project planning       | [project/](./project/)                                                                                                                                                 |
| Diagrams               | [diagrams/](./diagrams/)                                                                                                                                               |
| Production readiness   | [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md), [project/PRODUCTION_READINESS_REPORT.md](./project/PRODUCTION_READINESS_REPORT.md)                               |
| Launch                 | [project/PRODUCTION_LAUNCH_CHECKLIST.md](./project/PRODUCTION_LAUNCH_CHECKLIST.md), [project/FINAL_IMPLEMENTATION_REPORT.md](./project/FINAL_IMPLEMENTATION_REPORT.md) |
| External gates         | [project/EXTERNAL_PREREQUISITES.md](./project/EXTERNAL_PREREQUISITES.md)                                                                                               |
| Staging / RC           | [project/BUILD_METADATA.md](./project/BUILD_METADATA.md), root `VERSION` / `CHANGELOG.md` / `RELEASE_NOTES.md`                                                         |
| Security audit (M24)   | [Security/SECURITY_AUDIT_M24.md](./Security/SECURITY_AUDIT_M24.md)                                                                                                     |
| Compliance             | [Compliance/COMPLIANCE_READINESS.md](./Compliance/COMPLIANCE_READINESS.md)                                                                                             |
| DR / deploy            | [Deployment/](./Deployment/), [Deployment/PRODUCTION_ARCHITECTURE.md](./Deployment/PRODUCTION_ARCHITECTURE.md)                                                         |

**Milestone completion logs:** [project/M15-M22-COMPLETION.md](./project/M15-M22-COMPLETION.md)
(includes M23–M25 pointers).

**Next:** EXTERNAL staging host + live payment/legal gates before claiming full
PRODUCTION READY. Do not invent credentials or vendor approvals in-repo.
