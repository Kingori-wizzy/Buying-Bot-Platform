'use client';

import {
  firstOfferPrice,
  formatMoneyMinor,
  PlatformApiError,
  type ProductSummary,
} from '@buying-bot/sdk';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { AddToCartButton } from '@/components/AddToCartButton';
import { createBrowserSdk } from '@/lib/api';

interface ChatTurn {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly products?: readonly ProductSummary[];
  readonly unavailable?: boolean;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `turn-${String(Date.now())}`;
}

export default function AssistantPage() {
  const [message, setMessage] = useState(
    'I need a laptop for software development under KES 100,000 with at least 16GB RAM.',
  );
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ask for products, budgets, or comparisons. I use authorized tools for prices and stock — I will never invent them. Matching catalog cards below replies are hydrated from the product API.',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [toolState, setToolState] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, busy]);

  async function onSubmit(e: { preventDefault(): void }): Promise<void> {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy) return;

    const userTurn: ChatTurn = { id: newId(), role: 'user', content: text };
    setTurns((prev) => [...prev, userTurn]);
    setMessage('');
    setBusy(true);
    setToolState('Consulting assistant tools…');

    const sdk = createBrowserSdk();
    let products: ProductSummary[] = [];
    try {
      setToolState('Hydrating catalog matches from the API…');
      const search = await sdk.searchProducts({ q: text, pageSize: 6 });
      products = [...search.items];
    } catch {
      products = [];
    }

    try {
      setToolState('Waiting for assistant reply…');
      const body = await sdk.chat(text);
      const content =
        body.result.content ??
        'I could not produce a text reply, but catalog matches below are from the API.';
      setTurns((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content,
          products,
        },
      ]);
    } catch (err) {
      if (err instanceof PlatformApiError && err.status === 503) {
        setTurns((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            unavailable: true,
            content:
              'The AI service is temporarily unavailable. You can keep shopping — catalog, cart, and checkout still work. Showing live catalog matches for your query when available.',
            products,
          },
        ]);
      } else if (err instanceof PlatformApiError && err.status === 401) {
        setTurns((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'system',
            content: 'Sign in to use the shopping assistant.',
          },
        ]);
      } else {
        setTurns((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'system',
            content:
              err instanceof PlatformApiError
                ? err.message
                : 'Assistant request failed. Please retry.',
            products,
          },
        ]);
      }
    } finally {
      setBusy(false);
      setToolState(null);
    }
  }

  return (
    <main className="page" id="main">
      <section className="chat-shell">
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
            AI shopping assistant
          </h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Product cards use live catalog/search APIs. Prices and availability
            are never invented in the browser.
          </p>
        </div>

        <div className="chat-thread" aria-live="polite">
          {turns.map((turn) => (
            <div key={turn.id} className="stack" style={{ gap: '0.65rem' }}>
              <div
                className={
                  turn.role === 'user'
                    ? 'bubble user'
                    : turn.role === 'assistant'
                      ? 'bubble assistant'
                      : 'alert'
                }
              >
                {turn.unavailable ? <strong>AI unavailable · </strong> : null}
                {turn.content}
              </div>
              {turn.products && turn.products.length > 0 ? (
                <ul className="card-list">
                  {turn.products.map((product) => {
                    const price = firstOfferPrice(product);
                    return (
                      <li key={product.id} className="product-card">
                        <div className="thumb" aria-hidden>
                          {product.name.slice(0, 1)}
                        </div>
                        <h3>
                          <Link href={`/products/${product.slug}`}>
                            {product.name}
                          </Link>
                        </h3>
                        {product.shortDescription ? (
                          <p className="muted" style={{ margin: 0 }}>
                            {product.shortDescription}
                          </p>
                        ) : null}
                        <p className="price" style={{ margin: 0 }}>
                          {price
                            ? formatMoneyMinor(
                                price.listPriceMinor,
                                price.currency,
                              )
                            : 'Price on request'}
                        </p>
                        <p
                          className="muted"
                          style={{ margin: 0, fontSize: '0.85rem' }}
                        >
                          Matched from catalog search for your query.
                        </p>
                        <div className="cta-row">
                          {price ? (
                            <AddToCartButton offerId={price.offerId} />
                          ) : null}
                          <Link
                            className="btn btn-secondary"
                            href={`/products/${product.slug}`}
                          >
                            View product
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ))}
          {busy ? (
            <div className="bubble assistant">
              {toolState ?? 'Thinking…'}
              <div className="skeleton" style={{ height: 12, marginTop: 8 }} />
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          className="panel stack"
          onSubmit={(e) => {
            void onSubmit(e);
          }}
        >
          <label htmlFor="assistant-message">Your message</label>
          <textarea
            id="assistant-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            rows={3}
            required
          />
          <div className="cta-row">
            <button
              className="btn"
              type="submit"
              disabled={busy || !message.trim()}
            >
              {busy ? 'Working…' : 'Send'}
            </button>
            <Link className="btn btn-secondary" href="/products">
              Browse catalog
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
