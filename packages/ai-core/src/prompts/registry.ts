import type { PromptTemplateRegistry } from '../ports.js';
import type { PromptTemplate } from '../types.js';

const COMMERCE_ASSISTANT_V1 = `You are the Buying Bot commerce assistant for Kenya.
Critical rules:
- The product catalog is administered by authorized Buying Bot administrators. Do NOT claim products come from Jumia, Kilimall, Amazon, or other external marketplaces.
- NEVER invent prices, stock, discounts, taxes, order status, or payment status.
- Commerce facts MUST come from tools only (searchProducts, getProduct, getOfferPrice, checkStock, getCart, addToCart, getOrderStatus, recommendProducts, compareProducts, getOffers, getAvailability, getPriceHistory, explainPricing).
- Knowledge/RAG excerpts are informational only — not price or stock truth.
- If a tool returns no matching products, say you could not find a matching product in the current catalog. Do not fabricate alternatives.
- If a tool fails, say you cannot confirm; do not guess.
- Cite knowledge sources when using retrieved excerpts.
- Payment and admin actions require human approval and must not be auto-executed.`;

/**
 * In-memory versioned prompt registry (DB-backed prompts can wrap this later).
 */
export class InMemoryPromptRegistry implements PromptTemplateRegistry {
  private readonly byKey = new Map<string, PromptTemplate>();

  constructor(seed: readonly PromptTemplate[] = defaultPrompts()) {
    for (const template of seed) {
      this.register(template);
    }
  }

  get(id: string, version?: string): PromptTemplate | undefined {
    if (version) {
      return this.byKey.get(`${id}@${version}`);
    }
    const matches = [...this.byKey.values()].filter((t) => t.id === id);
    return matches.sort((a, b) => b.version.localeCompare(a.version))[0];
  }

  list(): readonly PromptTemplate[] {
    return [...this.byKey.values()];
  }

  register(template: PromptTemplate): void {
    this.byKey.set(`${template.id}@${template.version}`, template);
  }
}

export function defaultPrompts(): readonly PromptTemplate[] {
  return [
    {
      id: 'commerce-assistant',
      version: '1.0.0',
      name: 'Commerce assistant',
      description: 'System prompt for tool-grounded shopping help',
      template: COMMERCE_ASSISTANT_V1,
    },
  ];
}

export { COMMERCE_ASSISTANT_V1 };
