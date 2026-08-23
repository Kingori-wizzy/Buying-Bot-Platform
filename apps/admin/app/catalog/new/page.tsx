'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface NamedRow {
  id: string;
  name: string;
}

export default function CatalogCreatePage() {
  const router = useRouter();
  const { can } = useAdminSession();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [listPriceMinor, setListPriceMinor] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brands, setBrands] = useState<NamedRow[]>([]);
  const [categories, setCategories] = useState<NamedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const sdk = createBrowserSdk();
        const [b, c] = await Promise.all([
          sdk.listBrands(),
          sdk.listCategories(),
        ]);
        setBrands(Array.isArray(b) ? (b as NamedRow[]) : []);
        setCategories(Array.isArray(c) ? (c as NamedRow[]) : []);
      } catch {
        // taxonomy optional at create time
      }
    })();
  }, []);

  if (!can('catalog', 'create')) {
    return <p className="error">Missing catalog:create (UI gate only).</p>;
  }

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const price = listPriceMinor.trim()
        ? Number.parseInt(listPriceMinor, 10)
        : undefined;
      const stock = Number.parseInt(initialStock, 10);
      const created = (await createBrowserSdk().adminCreateProduct({
        name,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        ...(shortDescription.trim()
          ? { shortDescription: shortDescription.trim() }
          : {}),
        status,
        contentOrigin: 'ADMIN',
        ...(brandId ? { brandId } : {}),
        ...(categoryId ? { primaryCategoryId: categoryId } : {}),
        ...(price !== undefined && Number.isFinite(price)
          ? { listPriceMinor: price, currency: 'KES' }
          : {}),
        ...(Number.isFinite(stock) ? { initialStock: stock } : {}),
      })) as { id: string };
      router.push(`/catalog/${created.id}`);
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <h1>Create product</h1>
      <p className="muted">
        Products are managed by administrators. Create as DRAFT, then set price
        and publish when ready. Manage brands/categories under Catalog → Brands
        &amp; categories.
      </p>
      <form
        className="panel"
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="slug">Slug (optional)</label>
          <input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="brand">Brand</label>
          <select
            id="brand"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
            }}
          >
            <option value="">— none —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
            }}
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="short">Short description</label>
          <textarea
            id="short"
            value={shortDescription}
            onChange={(e) => {
              setShortDescription(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="price">List price (minor units, optional)</label>
          <input
            id="price"
            inputMode="numeric"
            value={listPriceMinor}
            onChange={(e) => {
              setListPriceMinor(e.target.value);
            }}
            placeholder="e.g. 6499900"
          />
        </div>
        <div className="field">
          <label htmlFor="stock">Initial stock</label>
          <input
            id="stock"
            inputMode="numeric"
            value={initialStock}
            onChange={(e) => {
              setInitialStock(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'DRAFT' | 'ACTIVE');
            }}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE (requires price)</option>
          </select>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Create'}
        </button>
      </form>
    </section>
  );
}
