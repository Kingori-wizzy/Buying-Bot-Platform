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
  parentId?: string | null;
  children?: CategoryRow[];
}

export default function TaxonomyPage() {
  const { can } = useAdminSession();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brandName, setBrandName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [parentId, setParentId] = useState('');
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

  async function createCategory(e: { preventDefault(): void }): Promise<void> {
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
        ...(parentId ? { parentId } : {}),
      });
      setCategoryName('');
      // Keep parent selected so admins can add many subcategories in a row.
      if (!parentId) {
        setParentId('');
      }
      await reload();
      setMessage(parentId ? 'Subcategory created' : 'Category created');
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

  async function archiveCategory(id: string, name: string): Promise<void> {
    if (!can('catalog', 'update')) {
      setError('Missing catalog:update');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createBrowserSdk().adminUpdateCategory(id, {
        name,
        active: false,
        archived: true,
      });
      await reload();
      setMessage('Category archived');
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Category archive failed',
      );
    } finally {
      setBusy(false);
    }
  }

  const roots = categories.filter((c) => !c.parentId);

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Categories &amp; brands</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Digital shop taxonomy. Seeded root categories are a starting point.
            Add as many subcategories under a parent as you need — the form
            keeps the parent selected after each create.
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

        <form className="panel stack" onSubmit={(e) => void createCategory(e)}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
            Create category / subcategory
          </h2>
          <div className="field">
            <label htmlFor="parentId">Parent (optional → subcategory)</label>
            <select
              id="parentId"
              value={parentId}
              onChange={(e) => {
                setParentId(e.target.value);
              }}
            >
              <option value="">— top-level category —</option>
              {roots.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
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
            {busy
              ? 'Saving…'
              : parentId
                ? 'Add subcategory'
                : 'Add category'}
          </button>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {roots.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>{' '}
                <span className="muted">({c.slug})</span>{' '}
                {can('catalog', 'update') ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={busy}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.5rem',
                      marginLeft: '0.35rem',
                    }}
                    onClick={() => {
                      void archiveCategory(c.id, c.name);
                    }}
                  >
                    Archive
                  </button>
                ) : null}
                {c.children && c.children.length > 0 ? (
                  <ul>
                    {c.children.map((child) => (
                      <li key={child.id}>
                        {child.name}{' '}
                        <span className="muted">({child.slug})</span>{' '}
                        {can('catalog', 'update') ? (
                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={busy}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                            }}
                            onClick={() => {
                              void archiveCategory(child.id, child.name);
                            }}
                          >
                            Archive
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </form>
      </div>
    </section>
  );
}
