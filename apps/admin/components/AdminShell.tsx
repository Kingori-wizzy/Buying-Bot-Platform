'use client';

import type { AuthMe } from '@buying-bot/sdk';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createBrowserSdk, hasPermission } from '@/lib/api';

interface AdminSessionValue {
  readonly me: AuthMe | null;
  readonly loading: boolean;
  readonly refresh: () => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly can: (resource: string, action: string) => boolean;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error('useAdminSession requires AdminShell');
  }
  return ctx;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await createBrowserSdk().me();
      setMe(next);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (pathname === '/login') return;
    if (me?.realm !== 'admin') {
      router.replace('/login');
    }
  }, [loading, me, pathname, router]);

  const logout = useCallback(async () => {
    try {
      await createBrowserSdk().logout();
    } finally {
      setMe(null);
      router.push('/login');
    }
  }, [router]);

  const value = useMemo<AdminSessionValue>(
    () => ({
      me,
      loading,
      refresh,
      logout,
      can: (resource, action) =>
        me ? hasPermission(me.permissions, resource, action) : false,
    }),
    [me, loading, refresh, logout],
  );

  const showNav = pathname !== '/login' && me?.realm === 'admin';

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const storefrontAssistant =
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.replace(/\/$/, '') ??
    'http://localhost:3001';

  return (
    <AdminSessionContext.Provider value={value}>
      <div className={showNav ? 'shell' : 'shell shell-auth'}>
        {showNav ? (
          <aside className="sidebar">
            <Link className="brand" href="/">
              Buying Bot Admin
            </Link>
            <nav aria-label="Admin">
              <Link href="/" aria-current={isActive('/') ? 'page' : undefined}>
                Dashboard
              </Link>

              {value.can('catalog', 'read') || value.can('catalog', 'create') ? (
                <>
                  <p className="nav-section">Catalog</p>
                  <Link
                    href="/catalog"
                    aria-current={
                      isActive('/catalog') &&
                      !pathname.startsWith('/catalog/taxonomy') &&
                      !pathname.startsWith('/catalog/imports') &&
                      !pathname.startsWith('/catalog/sources')
                        ? 'page'
                        : undefined
                    }
                  >
                    Products
                  </Link>
                  <Link
                    href="/catalog/taxonomy"
                    aria-current={
                      isActive('/catalog/taxonomy') ? 'page' : undefined
                    }
                  >
                    Brands & categories
                  </Link>
                  {value.can('catalog', 'create') ? (
                    <Link
                      href="/catalog/imports"
                      aria-current={
                        isActive('/catalog/imports') ? 'page' : undefined
                      }
                    >
                      Imports
                    </Link>
                  ) : null}
                  <Link
                    href="/catalog/sources"
                    aria-current={
                      isActive('/catalog/sources') ? 'page' : undefined
                    }
                  >
                    Sources
                  </Link>
                </>
              ) : null}

              {value.can('inventory', 'read') ||
              value.can('inventory', 'update') ? (
                <Link
                  href="/inventory"
                  aria-current={isActive('/inventory') ? 'page' : undefined}
                >
                  Inventory
                </Link>
              ) : null}

              {value.can('orders', 'read') ? (
                <Link
                  href="/orders"
                  aria-current={isActive('/orders') ? 'page' : undefined}
                >
                  Orders
                </Link>
              ) : null}

              {value.can('customers', 'read') ? (
                <Link
                  href="/customers"
                  aria-current={isActive('/customers') ? 'page' : undefined}
                >
                  Customers
                </Link>
              ) : null}

              {value.can('catalog', 'create') || value.can('catalog', 'read') ? (
                <Link
                  href="/promotions"
                  aria-current={isActive('/promotions') ? 'page' : undefined}
                >
                  Promotions
                </Link>
              ) : null}

              {value.can('audit', 'read') ? (
                <Link
                  href="/audit"
                  aria-current={isActive('/audit') ? 'page' : undefined}
                >
                  Audit log
                </Link>
              ) : null}

              <a
                href={`${storefrontAssistant}/assistant`}
                rel="noreferrer"
                target="_blank"
              >
                AI (storefront)
              </a>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  void logout();
                }}
              >
                Log out
              </button>
            </nav>
          </aside>
        ) : null}
        <div className={showNav ? 'content' : 'auth-stage'}>{children}</div>
      </div>
    </AdminSessionContext.Provider>
  );
}
