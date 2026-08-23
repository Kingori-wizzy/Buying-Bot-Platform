'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface BrandRow {
  id: string;
  name: string;
  slug: string;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
}

export default function TaxonomyPage() {
  const { can } = useAdminSession();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brandName, setBrandName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload(): Promise<void> {
    const sdk = createBrowserSdk();
    const [b, c] = await Promise.all([sdk.listBrands(), sdk.listCategories()]);
    setBrands(Array.isArray(b) ? (b as BrandRow[]) : []);
    setCategories(Array.isArray(c) ? (c as CategoryRow[]) : []);
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof PlatformApiError ? err.message : 'Load failed');
      }
    })();
  }, []);

  async function createBrand(e: { preventDefault(): void }): Promise<void> {
    e.preventDefault();
    if (!can('catalog', 'create')) {
      setError('Missing catalog:create');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createBrowserSdk().adminCreateBrand({ name: brandName.trim() });
      setBrandName('');
      await reload();
      setMessage('Brand created');
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Brand create failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function createCategory(e: {
    preventDefault(): void;
  }): Promise<void> {
    e.preventDefault();
    if (!can('catalog', 'create')) {
      setError('Missing catalog:create');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createBrowserSdk().adminCreateCategory({
        name: categoryName.trim(),
        active: true,
      });
      setCategoryName('');
      await reload();
      setMessage('Category created');
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Category create failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Brands & categories</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Taxonomy for admin-managed products. Mutations go through the API.
          </p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}

      <div
        style={{
          display: 'grid',
          gap: '1.25rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <form className="panel stack" onSubmit={(e) => void createBrand(e)}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Create brand</h2>
          <div className="field">
            <label htmlFor="brandName">Name</label>
            <input
              id="brandName"
              value={brandName}
              onChange={(e) => {
                setBrandName(e.target.value);
              }}
              required
            />
          </div>
          <button
            className="btn"
            type="submit"
            disabled={busy || !can('catalog', 'create')}
          >
            {busy ? 'Saving…' : 'Add brand'}
          </button>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {brands.map((b) => (
              <li key={b.id}>
                {b.name} <span className="muted">({b.slug})</span>
              </li>
            ))}
          </ul>
        </form>

        <form
          className="panel stack"
          onSubmit={(e) => void createCategory(e)}
        >
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Create category</h2>
          <div className="field">
            <label htmlFor="categoryName">Name</label>
            <input
              id="categoryName"
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
              }}
              required
            />
          </div>
          <button
            className="btn"
            type="submit"
            disabled={busy || !can('catalog', 'create')}
          >
            {busy ? 'Saving…' : 'Add category'}
          </button>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {categories.map((c) => (
              <li key={c.id}>
                {c.name} <span className="muted">({c.slug})</span>
              </li>
            ))}
          </ul>
        </form>
      </div>
    </section>
  );
}
