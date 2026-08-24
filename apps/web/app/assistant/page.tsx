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

const SUGGESTED_PROMPTS = [
  'Laptops under KES 80,000 with at least 16 GB RAM',
  'Best smartphones for photography under KES 50,000',
  'Compare available tablets for students',
  'What gaming accessories do you stock?',
];

export default function AssistantPage() {
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! I can help you find products that match your needs and budget. I use live catalog data for prices and availability — I never invent them.\n\nTry one of the suggestions below, or type your own question.',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'streaming' | 'error'
  >('idle');
  const [toolState, setToolState] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, busy, draft, toolState]);

  function stopStream(): void {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setToolState(null);
    setConnectionState('idle');
  }

  async function onSubmit(e: { preventDefault(): void }): Promise<void> {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy) return;

    const userTurn: ChatTurn = { id: newId(), role: 'user', content: text };
    setTurns((prev) => [...prev, userTurn]);
    setMessage('');
    setBusy(true);
    setDraft('');
    setConnectionState('connecting');
    setToolState('Connecting to assistant…');

    const sdk = createBrowserSdk();
    let products: ProductSummary[] = [];
    try {
      setToolState('Hydrating catalog matches from the API…');
      const search = await sdk.searchProducts({ q: text, pageSize: 6 });
      products = [...search.items];
    } catch {
      products = [];
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let streamed = '';
    let sawDelta = false;

    try {
      setConnectionState('streaming');
      setToolState('Waiting for stream…');
      for await (const event of sdk.chatStream(text, {
        signal: controller.signal,
      })) {
        if (event.type === 'status') {
          setToolState(event.text);
        } else if (event.type === 'delta') {
          sawDelta = true;
          streamed += event.text;
          setDraft(streamed);
          setToolState(null);
        } else if (event.type === 'error') {
          throw new Error(event.message);
        } else {
          break;
        }
      }

      const content =
        streamed.trim() ||
        (sawDelta
          ? streamed
          : 'I could not produce a text reply, but catalog matches below are from the API.');
      setTurns((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content,
          products,
        },
      ]);
      setConnectionState('idle');
    } catch (err) {
      if (controller.signal.aborted) {
        if (streamed.trim()) {
          setTurns((prev) => [
            ...prev,
            {
              id: newId(),
              role: 'assistant',
              content: streamed,
              products,
            },
          ]);
        }
        setConnectionState('idle');
      } else if (err instanceof PlatformApiError && err.status === 503) {
        setConnectionState('error');
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
        setConnectionState('error');
        setTurns((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'system',
            content: 'Sign in to use the shopping assistant.',
          },
        ]);
      } else {
        setConnectionState('error');
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
      abortRef.current = null;
      setBusy(false);
      setToolState(null);
      setDraft('');
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
            Responses stream from the API. Product cards use live catalog
            search. Prices and availability are never invented in the browser.
          </p>
        </div>

        <p className="muted" aria-live="polite" style={{ margin: 0 }}>
          {connectionState === 'connecting'
            ? 'Connecting…'
            : connectionState === 'streaming'
              ? 'Streaming reply…'
              : connectionState === 'error'
                ? 'Assistant connection failed — catalog shopping still works.'
                : 'Ready'}
        </p>

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
                            : 'Not currently purchasable'}
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
              {draft.length > 0 ? draft : (toolState ?? 'Thinking…')}
              {!draft ? (
                <div
                  className="skeleton"
                  style={{ height: 12, marginTop: 8 }}
                />
              ) : null}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {turns.length === 1 && !busy ? (
          <div className="chat-suggestions" aria-label="Suggested prompts">
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Try asking:
            </p>
            <div className="suggestions-row">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="suggestion-pill"
                  onClick={() => {
                    setMessage(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

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
            placeholder="e.g. I need a laptop for development under KES 100,000…"
          />
          <div className="cta-row">
            <button
              className="btn"
              type="submit"
              disabled={busy || !message.trim()}
            >
              {busy ? 'Working…' : 'Send'}
            </button>
            {busy ? (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={stopStream}
              >
                Stop
              </button>
            ) : null}
            <Link className="btn btn-secondary" href="/">
              Shop by category
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
