'use client';

import {
  firstOfferPrice,
  formatMoneyMinor,
  PlatformApiError,
  type ProductSummary,
} from '@buying-bot/sdk';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AddToCartButton } from '@/components/AddToCartButton';
import { createBrowserSdk } from '@/lib/api';

interface ChatTurn {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly products?: readonly ProductSummary[];
  readonly unavailable?: boolean;
}

const CONVERSATION_STORAGE_KEY = 'bb_assistant_conversation_id';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `turn-${String(Date.now())}`;
}

const WELCOME =
  'Hi! I can help you find products that match your needs and budget. I use live catalog data for prices and availability — I never invent them.';

function assistantErrorMessage(err: unknown): string {
  if (err instanceof PlatformApiError) {
    if (err.status === 401) {
      return 'Sign in to use the shopping assistant.';
    }
    if (err.status === 403) {
      return 'You do not have access to this conversation.';
    }
    if (err.status === 503 || err.code === 'AI_SERVICE_UNAVAILABLE') {
      return 'The AI service is temporarily unavailable. Catalog, cart, and checkout still work.';
    }
    if (err.status === 502 || err.code === 'AI_SERVICE_ERROR') {
      return 'The assistant could not complete your request. Please try again.';
    }
    if (err.status === 400 || err.status === 422) {
      return err.message || 'Your message could not be processed.';
    }
    return err.message;
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return '';
  }
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return 'Network error — check your connection and try again.';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Assistant request failed. Please retry.';
}

export default function AssistantPage() {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME },
  ]);
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'streaming' | 'error'
  >('idle');
  const [toolState, setToolState] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const persistConversationId = useCallback((id: string | null) => {
    setConversationId(id);
    if (typeof window === 'undefined') {
      return;
    }
    if (id) {
      sessionStorage.setItem(CONVERSATION_STORAGE_KEY, id);
    } else {
      sessionStorage.removeItem(CONVERSATION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, busy, draft, toolState]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateConversation(): Promise<void> {
      if (typeof window === 'undefined') {
        setHydrating(false);
        return;
      }
      const stored = sessionStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (!stored) {
        setHydrating(false);
        return;
      }
      try {
        const sdk = createBrowserSdk();
        const conversation = await sdk.getConversation(stored);
        if (cancelled) {
          return;
        }
        persistConversationId(conversation.conversationId);
        const restored: ChatTurn[] = [
          { id: 'welcome', role: 'assistant', content: WELCOME },
        ];
        for (const row of conversation.messages) {
          if (row.role !== 'user' && row.role !== 'assistant') {
            continue;
          }
          restored.push({
            id: row.id,
            role: row.role,
            content: row.content,
            ...(row.products ? { products: [...row.products] } : {}),
          });
        }
        setTurns(restored);
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(CONVERSATION_STORAGE_KEY);
        }
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    }
    void hydrateConversation();
    return () => {
      cancelled = true;
    };
  }, [persistConversationId]);

  function startNewConversation(): void {
    stopStream();
    persistConversationId(null);
    setTurns([{ id: 'welcome', role: 'assistant', content: WELCOME }]);
    setConnectionState('idle');
  }

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
    const controller = new AbortController();
    abortRef.current = controller;
    let streamed = '';
    let products: ProductSummary[] = [];
    let nextConversationId = conversationId ?? undefined;

    try {
      setConnectionState('streaming');
      setToolState('Waiting for assistant reply…');
      for await (const event of sdk.chatStream(text, {
        ...(nextConversationId ? { conversationId: nextConversationId } : {}),
        signal: controller.signal,
      })) {
        if (event.type === 'status') {
          setToolState(event.text);
        } else if (event.type === 'delta') {
          streamed += event.text;
          setDraft(streamed);
          setToolState(null);
        } else if (event.type === 'error') {
          throw new Error(event.message);
        } else if (event.type === 'done') {
          if (event.conversationId) {
            nextConversationId = event.conversationId;
            persistConversationId(event.conversationId);
          }
          if (event.products && event.products.length > 0) {
            products = [...event.products];
          }
        }
      }

      const content = streamed.trim();
      if (!content) {
        throw new Error('The assistant returned an empty reply.');
      }

      setTurns((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content,
          ...(products.length > 0 ? { products } : {}),
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
              ...(products.length > 0 ? { products } : {}),
            },
          ]);
        }
        setConnectionState('idle');
      } else {
        const errorText = assistantErrorMessage(err);
        setConnectionState('error');
        if (errorText) {
          const unavailable =
            err instanceof PlatformApiError &&
            (err.status === 503 || err.code === 'AI_SERVICE_UNAVAILABLE');
          setTurns((prev) => [
            ...prev,
            {
              id: newId(),
              role: unavailable ? 'assistant' : 'system',
              content: errorText,
              ...(unavailable ? { unavailable: true } : {}),
            },
          ]);
        }
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
            Responses stream from the API with catalog-backed product cards.
            Prices and availability are never invented in the browser.
          </p>
        </div>

        <p className="muted" aria-live="polite" style={{ margin: 0 }}>
          {hydrating
            ? 'Loading conversation…'
            : connectionState === 'connecting'
              ? 'Connecting…'
              : connectionState === 'streaming'
                ? 'Streaming reply…'
                : connectionState === 'error'
                  ? 'Assistant request failed — catalog shopping still works.'
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
                          Recommended from the live catalog.
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
            disabled={hydrating}
          />
          <div className="cta-row">
            <button
              className="btn"
              type="submit"
              disabled={busy || hydrating || !message.trim()}
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
            ) : (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={startNewConversation}
                disabled={hydrating}
              >
                New conversation
              </button>
            )}
            <Link className="btn btn-secondary" href="/">
              Shop by category
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
