# AI Production (VPS)

## Rules

AI is **never** authoritative for price, stock, totals, payment, or permissions.  
Tools call API/catalog. Unavailable → controlled failure (`AI_SERVICE_UNAVAILABLE`), commerce continues.

## Default on VPS

`AI_PROVIDER=deterministic` (or configured remote LLM) via `ai-service` container — light RAM.

## Optional Ollama

Only if VPS has enough RAM (typically **≥16GB** free for small models; 7B models prefer 8–16GB+).  
Do **not** auto-deploy large models on 2–4GB Hostinger plans.

```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=mistral
```

Ollama is **not** in the default production Compose profile.

## Security

- No provider keys in browser
- Internal Docker network only for ai-service
- Nginx `/ai/` optional
