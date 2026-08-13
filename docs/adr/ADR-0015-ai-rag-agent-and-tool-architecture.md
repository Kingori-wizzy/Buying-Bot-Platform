# ADR-0015: AI, RAG, agent, and tool architecture

- Status: **Accepted**
- Date: 2026-08-13
- Deciders: Platform Architecture; accepted by architecture program review on
  2026-08-13
- Aligns with: [docs/ARCHITECTURE.md](../ARCHITECTURE.md),
  ADR-0005–ADR-0014 (**Accepted**), especially ADR-0008, ADR-0010–0013
- Scope: `apps/ai-service`, model/embedding ports, RAG, constrained agents,
  tools, guardrails, streaming, cost/safety controls
- Out of scope: Implementing agents; buying LLM vendors; creating vector
  tables; modifying apps

## 1. Context

Buying Bot is AI-assisted commerce. `@buying-bot/ai-core` already defines
model/tool risk ports. ADR-0006 places pgvector in PostgreSQL. ADR-0008/0010–
0012 forbid AI inventing money/stock/state.

## 2. Problem

Unrestricted agents with DB access would hallucinate prices, bypass AuthZ,
and leak PII. RAG mixed with transactional data would blur truth.

## 3. Goals / Non-goals

**Goals:** constrained tool-calling agents; RAG for knowledge only;
authoritative tools for catalog/cart/order; identity propagation; streaming
(SSE per ADR-0007/0009); audit every tool call.

**Non-goals:** fully autonomous unsupervised agents; AI as payment
authority; custom foundation model training in v1.

## 4. Decision

```text
Customer → Nest API (AuthN/AuthZ) → apps/ai-service (service JWT)
  → ModelProvider + AgentRuntime
  → authorized Tools → Nest API / application services
  → PostgreSQL / calculation engine / inventory
```

**Critical rules (accepted):**

- AI **never** connects to PostgreSQL or Redis directly.
- AI **never** runs arbitrary SQL.
- AI **never invents** prices, stock, discounts, taxes, order/payment/
  shipment status.
- Financial values come only from ADR-0012 calculation / Offer tools.
- Inventory from ADR-0010 services; orders/payments/fulfillment from domain
  APIs (ADR-0011/0013).

## 5. Service boundary

| Component             | Role                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `apps/api`            | AuthZ edge; conversation CRUD; tool gateway for user-scoped calls |
| `apps/ai-service`     | Model orchestration, RAG retrieval planning, streaming            |
| `@buying-bot/ai-core` | Ports: ModelProvider, embeddings, tool defs, risk levels          |
| `apps/worker`         | Ingestion/embedding jobs                                          |

## 6. Model & embeddings

- `ModelProvider` / embedding ports — OpenAI/Anthropic/etc. as **adapters**
- Model routing + fallback model configuration
- Token budgets and per-user/org rate limits (Redis)
- Cost controls: max tokens, daily caps (policy)

pgvector embeddings in PostgreSQL (ADR-0006); rebuildable.

## 7. RAG architecture

| Corpus                           | Purpose                | Trust                          |
| -------------------------------- | ---------------------- | ------------------------------ |
| Policy / FAQ / help docs         | Informational          | Knowledge — cite sources       |
| Catalog text for semantic recall | Candidate **ids** only | Then hydrate via catalog tools |
| Operational/transactional data   | **Not** RAG corpus     | Tools only                     |

Flow: ingest (object storage + PG metadata) → chunk → embed → retrieve →
optional rerank → citations/provenance in response.

**Do not** treat RAG chunks as price/stock truth.

## 8. Agents & tools

Constrained tool-based agents (not unrestricted).

Tool categories:

- **Read tools:** searchProducts, getProduct, getOfferPrice, getOrderStatus,
  getShipmentTracking, getReturnPolicy
- **Write tools:** addToCart, startReturnRequest — require AuthZ + risk flags
- **Payment/admin tools:** `payment` / `admin` risk →
  `requiresHumanApproval` (ai-core) + elevated permissions

Tool schemas validated (Zod); arguments never trusted blindly.

## 9. Identity & AuthZ

- User principal propagated from API session/bearer (ADR-0008)
- Service JWT between API ↔ ai-service
- Tool execution re-checks permissions in API/domain — model is not AuthZ

## 10. Safety guardrails

- Prompt injection defenses: system prompt isolation, tool allow-lists,
  untrusted content tagged
- Output filtering for secrets; no echoing credentials
- Hallucination mitigation: require tool results for factual commerce claims
- Structured outputs where possible for actions
- Human escalation path for high-risk

## 11. Conversation & memory

- Conversations persisted in PostgreSQL (ADR-0006 `conversations` /
  `ai` schemas)
- Session context + optional summaries; **no** unbounded secret memory
- Privacy: user owns conversation; retention policy; admin access audited

## 12. Streaming

SSE / HTTP streams from API edge (ADR-0007/0009). AI service streams to API;
API enforces AuthZ before stream.

## 13. Observability & evaluation

Log: model, latency, tokens, tool names, success/fail, correlation ids.
**Never** log full prompts containing secrets/PII beyond redaction policy.
Eval harness for retrieval quality and tool correctness (ADR-0020).

## 14. Failure recovery

AI outage → commerce continues without assistant. Tool failure → safe error
to user; no invented fallback totals. Embedding job failure → DLQ; search
degrades to FTS (ADR-0010).

## 15. Alternatives rejected

Agent with direct DB credentials; RAG as order SoT; client-side LLM keys;
unrestricted shell/SQL tools; autonomous refund agent.

## 16. Dependencies

ADR-0005/0009 HTTP+SSE; ADR-0006 pgvector/queues; ADR-0008 AuthZ; ADR-0010–
0013 tools; ADR-0014 notifications via tools/APIs only.

## 17. Future

Multimodal search, fine-tuning, advanced multi-agent workflows, richer
eval suites — new ADRs if they change trust boundaries.

## 18. Decision status

**Accepted.** Indexed in [DECISIONS.md](../DECISIONS.md).
