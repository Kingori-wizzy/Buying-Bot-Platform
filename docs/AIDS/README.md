# AIDS — Application Interface Design Specification

## Purpose

Holds **Application Interface Design Specifications** describing interfaces _between applications_ in the platform (for example web ↔ API, admin ↔ API, API ↔ AI, API ↔ worker).

## Scope

- Inter-application communication styles (sync/async)
- Responsibility boundaries at the app edge
- High-level payload/contract expectations between deployables
- AuthN/AuthZ expectations at application boundaries
- Mapping of app-to-app interactions to omnichannel flows

## Alignment

AIDS sits between [`../SDS/`](../SDS/) and more detailed [`../IDS/`](../IDS/) / [`../IDDS/`](../IDDS/) / [`../API/`](../API/) specs. It must respect dependency rules in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (apps share via packages or APIs, never reverse deps).

## Contents

Documents will be added here later. Do not treat this README as an AIDS itself.
