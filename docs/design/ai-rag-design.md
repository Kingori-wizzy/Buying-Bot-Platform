# AI / RAG design

**Aligns with:** ADR-0015, 0010–0012, 0008, 0009

## Flow

```text
Customer → Web → API (AuthZ) → ai-service
  → retrieve RAG (knowledge) + call Tools
  → Tools → API/domain → PG / calculation / inventory
  → stream SSE to client
```

## Rules

- No direct PG/Redis/SQL from AI.
- No invented prices/stock/tax/order/payment/shipment status.
- RAG = FAQ/policy/help (+ catalog id recall then hydrate).
- Tools validated with Zod; re-AuthZ on every call.
- High-risk tools: permission + human approval flags (`ai-core`).

## Components

ModelProvider, embedding pipeline (worker), pgvector store, conversation
persistence, prompt/version config, token budgets, rate limits, tool audit.

## Evaluation

Offline fixtures for retrieval + tool correctness; production metrics for
latency/tokens/tool failures (ADR-0017/0020).
