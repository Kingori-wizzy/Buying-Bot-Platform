'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

export default function LoginPage() {
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
      await sdk.login({ email, password, realm: 'customer' });
      try {
        await sdk.mergeCart();
      } catch {
        // merge is best-effort after login
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page" id="main">
      <section className="stack" style={{ maxWidth: 480 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>Log in</h1>
        <p className="muted" style={{ margin: 0 }}>
          Customer realm session via httpOnly cookies.
        </p>
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
            />
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted">
          No account? <Link href="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}
