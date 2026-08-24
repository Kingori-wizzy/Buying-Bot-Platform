'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface NamedRow {
  id: string;
  name: string;
  parentId?: string | null;
}

const DIGITAL_TYPES = [
  'DIGITAL_ACCOUNT',
  'DIGITAL_SUBSCRIPTION',
  'DIGITAL_SERVICE',
  'DIGITAL_ACCESS',
  'DIGITAL_LICENSE',
  'DIGITAL_CREDENTIAL',
  'DIGITAL_REWARD',
  'OTHER',
] as const;

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
  const [rootCategoryId, setRootCategoryId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [digitalType, setDigitalType] =
    useState<(typeof DIGITAL_TYPES)[number]>('DIGITAL_ACCOUNT');
  const [inventoryMode, setInventoryMode] = useState<
    'FINITE' | 'UNLIMITED' | 'MANUAL'
  >('FINITE');
  const [deliveryMethod, setDeliveryMethod] = useState<
    | 'MANUAL'
    | 'ENTITLEMENT'
    | 'ACCESS_INSTRUCTIONS'
    | 'LICENSE_CODE'
    | 'DOWNLOAD'
  >('MANUAL');
  const [brands, setBrands] = useState<NamedRow[]>([]);
  const [categories, setCategories] = useState<NamedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roots = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );
  const subcategories = useMemo(
    () => categories.filter((c) => c.parentId === rootCategoryId),
    [categories, rootCategoryId],
  );

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
      const primaryCategoryId = categoryId || rootCategoryId || undefined;
      const created = (await createBrowserSdk().adminCreateProduct({
        name,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        ...(shortDescription.trim()
          ? { shortDescription: shortDescription.trim() }
          : {}),
        status,
        contentOrigin: 'ADMIN',
        productKind: 'DIGITAL',
        digitalType,
        inventoryMode,
        deliveryMethod,
        ...(brandId ? { brandId } : {}),
        ...(primaryCategoryId ? { primaryCategoryId } : {}),
        ...(price !== undefined && Number.isFinite(price)
          ? { listPriceMinor: price, currency: 'KES' }
          : {}),
        ...(inventoryMode === 'FINITE' && Number.isFinite(stock)
          ? { initialStock: stock }
          : {}),
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
      <h1>Create digital product</h1>
      <p className="muted">
        Admin-managed digital catalog. Select a main category (and optional
        subcategory), configure type and fulfillment, save as DRAFT, then
        publish when ready.
      </p>
      <form
        className="panel"
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <div className="field">
          <label htmlFor="rootCategory">1. Main category</label>
          <select
            id="rootCategory"
            value={rootCategoryId}
            onChange={(e) => {
              setRootCategoryId(e.target.value);
              setCategoryId('');
            }}
          >
            <option value="">— select —</option>
            {roots.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="subCategory">2. Subcategory (optional)</label>
          <select
            id="subCategory"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
            }}
            disabled={!rootCategoryId}
          >
            <option value="">— use main category —</option>
            {subcategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">3. Name</label>
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
          <label htmlFor="digitalType">5. Digital product type</label>
          <select
            id="digitalType"
            value={digitalType}
            onChange={(e) => {
              setDigitalType(e.target.value as (typeof DIGITAL_TYPES)[number]);
            }}
          >
            {DIGITAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="brand">Brand / platform (optional)</label>
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
          <label htmlFor="price">7. List price (minor units)</label>
          <input
            id="price"
            inputMode="numeric"
            value={listPriceMinor}
            onChange={(e) => {
              setListPriceMinor(e.target.value);
            }}
            placeholder="e.g. 199900 = KSh 1,999.00"
          />
        </div>
        <div className="field">
          <label htmlFor="inventoryMode">8. Inventory mode</label>
          <select
            id="inventoryMode"
            value={inventoryMode}
            onChange={(e) => {
              setInventoryMode(e.target.value as typeof inventoryMode);
            }}
          >
            <option value="FINITE">FINITE</option>
            <option value="UNLIMITED">UNLIMITED</option>
            <option value="MANUAL">MANUAL</option>
          </select>
        </div>
        {inventoryMode === 'FINITE' ? (
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
        ) : null}
        <div className="field">
          <label htmlFor="delivery">9. Digital delivery method</label>
          <select
            id="delivery"
            value={deliveryMethod}
            onChange={(e) => {
              setDeliveryMethod(e.target.value as typeof deliveryMethod);
            }}
          >
            <option value="MANUAL">MANUAL</option>
            <option value="ENTITLEMENT">ENTITLEMENT</option>
            <option value="ACCESS_INSTRUCTIONS">ACCESS_INSTRUCTIONS</option>
            <option value="LICENSE_CODE">LICENSE_CODE</option>
            <option value="DOWNLOAD">DOWNLOAD</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">11–12. Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'DRAFT' | 'ACTIVE');
            }}
          >
            <option value="DRAFT">DRAFT (save)</option>
            <option value="ACTIVE">ACTIVE / publish (requires price)</option>
          </select>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Create digital product'}
        </button>
      </form>
    </section>
  );
}
