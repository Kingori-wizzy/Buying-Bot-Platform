# `@buying-bot/ai-service`

AI orchestration service (ADR-0015). **Never** connects to PostgreSQL or Redis
for commerce truth. Model calls + RAG retrieval planning + tool loops only.

## Endpoints

| Method | Path                          | Auth                           | Purpose                      |
| ------ | ----------------------------- | ------------------------------ | ---------------------------- |
| GET    | `/health/live\|ready\|health` | none                           | Ops                          |
| GET    | `/metrics`                    | none                           | Prometheus text              |
| POST   | `/v1/chat`                    | Service JWT (`aud=ai-service`) | Chat turn                    |
| POST   | `/v1/chat/stream`             | Service JWT                    | SSE stream                   |
| POST   | `/v1/embed`                   | Service JWT                    | Embeddings for worker ingest |

## Providers

Set `AI_PROVIDER` to `openai` | `anthropic` | `gemini` | `ollama` | `deterministic`.

- Deterministic is allowed only when `NODE_ENV=test` or `AI_PROVIDER=deterministic`.
- Real providers **fail closed** without credentials.

## Env

See root `.env.example`: `SERVICE_JWT_SECRET`, `API_BASE_URL`, provider keys,
`OLLAMA_BASE_URL`.

## Scripts

| Script           | Purpose                               |
| ---------------- | ------------------------------------- |
| `pnpm build`     | Compile → `dist/`                     |
| `pnpm typecheck` | Typecheck                             |
| `pnpm test`      | Health, chat, stream, guardrail scrub |
| `pnpm start`     | `node dist/index.js`                  |
