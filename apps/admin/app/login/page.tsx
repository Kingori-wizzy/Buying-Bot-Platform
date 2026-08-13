'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { refresh } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa' | 'enroll'>(
    search.get('mfa') === '1' ? 'mfa' : 'credentials',
  );
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollUrl, setEnrollUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createBrowserSdk().login({
        email,
        password,
        realm: 'admin',
      });
      await refresh();
      if (result.mfaRequired) {
        setStep('mfa');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function onChallenge(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createBrowserSdk().mfaChallenge({ code: mfaCode.trim() });
      await refresh();
      router.push('/');
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'MFA challenge failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const enrolled = await createBrowserSdk().mfaEnroll();
      setEnrollSecret(enrolled.secret);
      setEnrollUrl(enrolled.otpauthUrl);
      setStep('enroll');
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'MFA enroll failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createBrowserSdk().mfaConfirm({ code: mfaCode.trim() });
      await createBrowserSdk().mfaChallenge({ code: mfaCode.trim() });
      await refresh();
      router.push('/');
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'MFA confirm failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack" style={{ maxWidth: 420 }}>
      <h1>Admin login</h1>
      <p className="muted">
        Uses the admin cookie realm. MFA is required for admin sessions.
      </p>

      {step === 'credentials' ? (
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
      ) : null}

      {step === 'mfa' ? (
        <form
          className="panel"
          onSubmit={(e) => {
            void onChallenge(e);
          }}
        >
          <div className="field">
            <label htmlFor="mfa">Authenticator code</label>
            <input
              id="mfa"
              value={mfaCode}
              onChange={(e) => {
                setMfaCode(e.target.value);
              }}
              required
              minLength={6}
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            Verify MFA
          </button>
          <p className="muted">
            First time?{' '}
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                void startEnroll();
              }}
            >
              Enroll TOTP
            </button>
          </p>
        </form>
      ) : null}

      {step === 'enroll' ? (
        <form
          className="panel"
          onSubmit={(e) => {
            void confirmEnroll(e);
          }}
        >
          <p className="muted">
            Scan or enter this secret in your authenticator.
          </p>
          {enrollUrl ? (
            <p>
              <code>{enrollUrl}</code>
            </p>
          ) : null}
          {enrollSecret ? (
            <p>
              Secret: <code>{enrollSecret}</code>
            </p>
          ) : null}
          <div className="field">
            <label htmlFor="confirm">Confirm code</label>
            <input
              id="confirm"
              value={mfaCode}
              onChange={(e) => {
                setMfaCode(e.target.value);
              }}
              required
              minLength={6}
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            Confirm MFA
          </button>
        </form>
      ) : null}
    </section>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
