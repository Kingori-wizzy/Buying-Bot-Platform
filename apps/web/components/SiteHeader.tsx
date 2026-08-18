'use client';

import type { AuthMe } from '@buying-bot/sdk';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [q, setQ] = useState('');

  const refresh = useCallback(async () => {
    try {
      const sdk = createBrowserSdk();
      const [session, cart] = await Promise.all([
        sdk.me().catch(() => null),
        sdk.getCart().catch(() => null),
      ]);
      setMe(session?.realm === 'customer' ? session : null);
      setCartCount(cart?.lines.reduce((n, line) => n + line.quantity, 0) ?? 0);
    } catch {
      setMe(null);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      await createBrowserSdk().logout();
    } finally {
      setMe(null);
      router.push('/');
      router.refresh();
    }
  }

  function onSearch(e: { preventDefault(): void }) {
    e.preventDefault();
    const query = q.trim();
    if (!query) {
      router.push('/search');
      return;
    }
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="site-header">
      <div className="site-header-row">
        <Link className="brand" href="/">
          Buying <span>Bot</span>
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          Menu
        </button>
        <nav
          id="primary-nav"
          className={open ? 'nav open' : 'nav'}
          aria-label="Primary"
        >
          <Link
            href="/products"
            aria-current={isActive(pathname, '/products') ? 'page' : undefined}
          >
            Products
          </Link>
          <Link
            href="/search"
            aria-current={isActive(pathname, '/search') ? 'page' : undefined}
          >
            Search
          </Link>
          <Link
            href="/assistant"
            aria-current={isActive(pathname, '/assistant') ? 'page' : undefined}
          >
            AI assistant
          </Link>
          <Link
            href="/cart"
            aria-current={isActive(pathname, '/cart') ? 'page' : undefined}
          >
            Cart
            {cartCount > 0 ? <span className="badge">{cartCount}</span> : null}
          </Link>
          {me ? (
            <>
              <Link
                href="/orders"
                aria-current={
                  isActive(pathname, '/orders') ? 'page' : undefined
                }
              >
                Orders
              </Link>
              <button
                className="linkish"
                type="button"
                onClick={() => void logout()}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                aria-current={isActive(pathname, '/login') ? 'page' : undefined}
              >
                Log in
              </Link>
              <Link
                href="/register"
                aria-current={
                  isActive(pathname, '/register') ? 'page' : undefined
                }
              >
                Register
              </Link>
            </>
          )}
        </nav>
        <form className="header-search" onSubmit={onSearch} role="search">
          <label className="sr-only" htmlFor="header-q">
            Search products
          </label>
          <input
            id="header-q"
            name="q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Search laptops, phones…"
            autoComplete="off"
          />
          <button className="btn" type="submit">
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
