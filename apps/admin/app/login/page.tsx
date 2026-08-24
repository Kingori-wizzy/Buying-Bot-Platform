'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refresh } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createBrowserSdk().login({
        email,
        password,
        realm: 'admin',
      });
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack" style={{ maxWidth: 420 }}>
      <h1>Admin login</h1>
      <p className="muted">
        Admin cookie realm. MFA is off unless the API sets{' '}
        <code>ADMIN_MFA_REQUIRED=true</code>.
      </p>

      <form
        className="panel"
        onSubmit={(e) => {
          void onLogin(e);
        }}
      >
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
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
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
