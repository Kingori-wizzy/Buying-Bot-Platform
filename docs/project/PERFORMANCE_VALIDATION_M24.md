# Performance validation (M24)

## Status: BLOCKED / ASPIRATIONAL (local)

k6 scripts exist under `infrastructure/perf/k6/`:

- `catalog-read.js`
- `checkout-smoke.js`

On the M24 verification workstation, **`k6` was not installed** (`k6` not on
PATH). No load numbers are claimed.

## How to run (EXTERNAL operator)

```bash
# EXTERNAL: install k6 from https://k6.io
export API_BASE_URL=http://127.0.0.1:3000
k6 run infrastructure/perf/k6/catalog-read.js
k6 run infrastructure/perf/k6/checkout-smoke.js
```

Record p95/p99 and error rate against **ASPIRATIONAL** targets from ADR-0020 /
M21 docs. Do not promote aspirational numbers to SLOs without signed evidence.

## Related engineering mitigations present

- Product GET cache (`product-cache.ts`)
- Fastify compression in API bootstrap
- Redis optional for rate limit / cache

## Classification

Performance: **BLOCKED** for measured production SLOs; scripts **PASS** as
artifacts ready for EXTERNAL execution.
