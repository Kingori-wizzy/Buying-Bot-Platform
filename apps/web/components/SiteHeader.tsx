'use client';

import type { AuthMe } from '@buying-bot/sdk';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createBrowserSdk, getAdminPortalLoginUrl } from '@/lib/api';
import { CART_CHANGED_EVENT } from '@/lib/cart-events';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

function AdminPortalIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.25c.9-3.2 3.2-4.75 6.5-4.75s5.6 1.55 6.5 4.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [q, setQ] = useState('');
  const adminLoginUrl = getAdminPortalLoginUrl();

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
    const onCartChanged = () => {
      void refresh();
    };
    window.addEventListener(CART_CHANGED_EVENT, onCartChanged);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, onCartChanged);
    };
  }, [refresh]);

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
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            Categories
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
          <a
            className="admin-entry"
            href={adminLoginUrl}
            title="Admin Portal"
            aria-label="Admin Portal"
          >
            <AdminPortalIcon />
            <span className="admin-entry-label">Admin</span>
          </a>
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
