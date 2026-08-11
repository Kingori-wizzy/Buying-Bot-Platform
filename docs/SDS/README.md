# SDS — Software Design Specification

## Purpose

Holds **Software Design Specifications** that describe _how_ the system fulfills the SRS: components, modules, data flows, and internal design decisions at the application level.

## Scope

- Logical and physical component design per deployable app
- Sequence/interaction design for key flows
- Shared package responsibilities and module boundaries
- Error handling, resiliency, and cross-cutting design patterns
- Traceability from SRS requirements to design elements

## Alignment

SDS implements [`../SRS/`](../SRS/) within the topology defined by [`../EAD/`](../EAD/). Interface and data details may reference [`../AIDS/`](../AIDS/), [`../IDS/`](../IDS/), [`../IDDS/`](../IDDS/), [`../API/`](../API/), and [`../Database/`](../Database/).

## Contents

| Document | Purpose |
|----------|---------|
| [`application-shells.md`](./application-shells.md) | Initial deployable app topology (scaffolds) |

Additional SDS volumes will be added later. Do not treat this README as an SDS itself.
