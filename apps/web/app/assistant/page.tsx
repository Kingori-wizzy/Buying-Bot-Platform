'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

export default function AssistantPage() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: { preventDefault(): void }): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setReply(null);
    try {
      const body = await createBrowserSdk().chat(message);
      setReply(body.result.content ?? JSON.stringify(body.result));
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Assistant request failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="stack" style={{ maxWidth: 720, margin: '2rem auto' }}>
      <h1>Shopping assistant</h1>
      <p className="muted">
        Answers use authorized tools for prices and stock — never invented
        totals.
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <label>
          Ask a question
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            rows={4}
            required
          />
        </label>
        <button type="submit" disabled={busy || !message.trim()}>
          {busy ? 'Thinking…' : 'Send'}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {reply ? (
        <section className="panel">
          <h2>Reply</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{reply}</p>
        </section>
      ) : null}
    </main>
  );
}
