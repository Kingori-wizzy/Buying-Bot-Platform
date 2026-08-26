'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refresh, loading } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailId = useId();
  const passwordId = useId();

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

  const storefrontUrl =
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.replace(/\/$/, '') ??
    'http://localhost:3001';

  if (loading) {
    return (
      <div className="login-screen" aria-busy="true">
        <div className="login-card login-card-loading">
          <div className="login-skeleton" />
          <p className="muted">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-atmosphere" aria-hidden />
      <div className="login-grid">
        <aside className="login-brand-panel">
          <p className="login-kicker">Operations</p>
          <h1 className="login-brand-title">
            Buying <span>Bot</span>
          </h1>
          <p className="login-brand-copy">
            Secure admin access for catalog, inventory, orders, and digital
            fulfillment. Authorization is enforced by the API — this screen only
            opens the admin session.
          </p>
          <ul className="login-points">
            <li>Separate admin session cookie</li>
            <li>Permission-gated console</li>
            <li>Server-authoritative catalog</li>
          </ul>
        </aside>

        <section className="login-card" aria-labelledby="admin-login-heading">
          <header className="login-card-head">
            <p className="login-badge">Admin portal</p>
            <h2 id="admin-login-heading">Sign in</h2>
            <p className="muted login-lede">
              Use your administrator credentials. Customer accounts cannot enter
              this portal.
            </p>
          </header>

          <form
            className="login-form"
            onSubmit={(e) => {
              void onLogin(e);
            }}
          >
            <div className="field">
              <label htmlFor={emailId}>Work email</label>
              <input
                id={emailId}
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                placeholder="ops@your-company.com"
                required
              />
            </div>
            <div className="field">
              <div className="login-label-row">
                <label htmlFor={passwordId}>Password</label>
                <button
                  type="button"
                  className="login-text-btn"
                  onClick={() => {
                    setShowPassword((v) => !v);
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                required
              />
            </div>

            {error ? (
              <p className="login-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="btn login-submit"
              type="submit"
              disabled={busy || !email.trim() || !password}
            >
              {busy ? 'Signing in…' : 'Enter admin console'}
            </button>
          </form>

          <footer className="login-footer">
            <a href={storefrontUrl}>← Back to storefront</a>
          </footer>
        </section>
      </div>
    </div>
  );
}
