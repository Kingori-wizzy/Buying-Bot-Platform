'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sdk = createBrowserSdk();
      await sdk.register({ email, password });
      await sdk.login({ email, password, realm: 'customer' });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : err instanceof TypeError
            ? 'Cannot reach the API. Start the API (port 3000) and retry.'
            : 'Registration failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page" id="main">
      <section className="stack" style={{ maxWidth: 480 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
          Create account
        </h1>
        <form
          className="panel"
          onSubmit={(e) => {
            void onSubmit(e);
          }}
        >
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password (min 10)</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              minLength={10}
              required
            />
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="muted">
          Already registered? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
