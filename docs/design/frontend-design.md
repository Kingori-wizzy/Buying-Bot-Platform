# Frontend design

**Aligns with:** ADR-0007, 0008, 0009, 0010–0015

## Apps

| App | Focus |
| --- | --- |
| web | Catalog, PDP, cart, checkout, account, AI chat |
| admin | Catalog, inventory, orders, payments, promos, audit, AI ops |
| docs | Architecture documentation site |

## Patterns

- App Router; RSC default; client components for interactive islands
- SDK + TanStack Query; RHF + Zod
- packages/ui tokens/primitives; no business workflows in ui package
- Separate admin cookies/origin
- SEO via generateMetadata from catalog
- a11y WCAG 2.2 AA target
- Loading/error boundaries; never trust client money/stock

## Security UX

Hide unauthorized actions for UX only; server enforces AuthZ.
