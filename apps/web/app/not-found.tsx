import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page" id="main">
      <section className="empty-state stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
          Page not found
        </h1>
        <p className="muted">That route does not exist in the storefront.</p>
        <div className="cta-row" style={{ justifyContent: 'center' }}>
          <Link className="btn" href="/products">
            Browse products
          </Link>
          <Link className="btn btn-secondary" href="/">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
