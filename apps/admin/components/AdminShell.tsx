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
      return;
    }
    if (!me.mfaSatisfied && pathname !== '/login') {
      router.replace('/login?mfa=1');
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

  return (
    <AdminSessionContext.Provider value={value}>
      <div className="shell">
        {showNav ? (
          <aside className="sidebar">
            <Link className="brand" href="/">
              Buying Bot Admin
            </Link>
            <nav aria-label="Admin">
              <Link href="/">Dashboard</Link>
              {value.can('catalog', 'read') ||
              value.can('catalog', 'create') ? (
                <Link href="/catalog">Catalog</Link>
              ) : null}
              {value.can('inventory', 'read') ||
              value.can('inventory', 'update') ? (
                <Link href="/inventory">Inventory</Link>
              ) : null}
              {value.can('orders', 'read') ? (
                <Link href="/orders">Orders</Link>
              ) : null}
              {value.can('catalog', 'create') ? (
                <Link href="/promotions">Promotions</Link>
              ) : null}
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  void logout();
                }}
              >
                Logout
              </button>
            </nav>
          </aside>
        ) : null}
        <div className="content">{children}</div>
      </div>
    </AdminSessionContext.Provider>
  );
}
