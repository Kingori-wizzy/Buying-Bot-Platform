# ADR — Architecture Decision Records

## Purpose

Holds **Architecture Decision Records**: durable records of significant technical and architectural choices, including context, decision, and consequences.

## Scope

- Tooling and platform decisions (monorepo, TypeScript, CI, etc.)
- Boundary and contract decisions across apps/packages
- Security, data, and deployment decisions that are expensive to reverse
- Status lifecycle: Proposed → Accepted → Deprecated / Superseded

## Alignment

Process and index: [`../DECISIONS.md`](../DECISIONS.md).  
Enterprise principles: [`../EAD/`](../EAD/) and [`../ARCHITECTURE.md`](../ARCHITECTURE.md).  
Documentation rules: [`../standards/documentation-standards.md`](../standards/documentation-standards.md).

## Existing records

Accepted foundation ADRs already in this folder are indexed in [`../DECISIONS.md`](../DECISIONS.md). New ADRs should use the next sequential `NNNN-short-title.md` filename.

## Contents policy

This folder stores ADRs only. Do not place BRS/SRS/SDS volumes here.
