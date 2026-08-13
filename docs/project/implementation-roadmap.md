# Implementation roadmap

## Phases

| Phase | Milestones | Type |
| --- | --- | --- |
| Documentation | M0 | DOCUMENTATION |
| Foundation | M1–M3 | ARCHITECTURE→IMPLEMENTATION |
| Identity | M4–M5 | IMPLEMENTATION + TESTING |
| Sellable catalog | M6–M8 | IMPLEMENTATION + TESTING |
| Commerce core | M9–M12 | IMPLEMENTATION + HARDENING |
| Experiences | M13–M14 | IMPLEMENTATION |
| AI | M15–M17 | IMPLEMENTATION + EVAL |
| Platform ops | M18–M22 | HARDENING + TESTING |
| Launch | M23–M25 | DEPLOYMENT |

## Work package template (each milestone)

1. Design spike against ADR/SRS  
2. Implement behind feature flags if needed  
3. Unit + integration tests in same PR  
4. Update OpenAPI/SDK when APIs land  
5. Docs delta  
6. Acceptance gate from milestones.md  

## Critical path

M0 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11 → M12 → M13 → M23 → M24 → M25

AI (M15–17) and admin (M14) can partially parallelize after M6/M12.
Notifications (M18) after M12.
