# AI incident runbook

## Principles (ADR-0015)

- AI outage must **not** block catalog, cart, or checkout.
- Never invent prices; tools re-AuthZ via API.

## Symptoms

- Assistant 5xx/timeouts, hallucinated commerce claims, prompt-injection reports,
  tool gateway abuse, embedding/RAG degradation

## Mitigations

1. Set storefront to hide assistant CTA / feature flag (operator).
2. Scale or restart `ai-service` only; leave `api` up.
3. Switch `AI_PROVIDER=deterministic` if vendor outage.
4. Revoke service JWT / rotate `SERVICE_JWT_SECRET` if abuse suspected.
5. Review guardrails logs (`ai.guardrails` tests define expectations).

## EXTERNAL

- Vendor status pages (OpenAI/Anthropic/etc.)
- Content moderation / trust & safety policy

## Exit criteria

Assistant healthy **or** explicitly disabled; commerce smoke still PASS.
