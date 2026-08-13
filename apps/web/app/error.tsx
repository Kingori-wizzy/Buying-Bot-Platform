'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page" id="main">
      <section className="empty-state stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
          Something went wrong
        </h1>
        <p className="muted">
          The page hit an unexpected error. Your cart and checkout are separate
          — try again or continue shopping.
        </p>
        <div className="cta-row" style={{ justifyContent: 'center' }}>
          <button className="btn" type="button" onClick={reset}>
            Retry
          </button>
          <Link className="btn btn-secondary" href="/">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
