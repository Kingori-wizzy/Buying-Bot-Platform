'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  status: string;
  contentOrigin?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  media?: {
    mediaAsset?: { id: string; externalUrl?: string | null; objectKey: string };
  }[];
  variants?: {
    id: string;
    name: string;
    sku?: {
      id: string;
      internalSku?: string;
      offers?: {
        id: string;
        listPriceMinor: number;
        currency: string;
        active: boolean;
      }[];
    } | null;
  }[];
}

export default function CatalogEditPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAdminSession();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [priceMinor, setPriceMinor] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload(): Promise<void> {
    const loaded = (await createBrowserSdk().adminGetProduct(
      params.id,
    )) as AdminProduct;
    setProduct(loaded);
    setName(loaded.name);
    setShortDescription(loaded.shortDescription ?? '');
    setDescription(loaded.description ?? '');
    setSeoTitle(loaded.seoTitle ?? '');
    setSeoDescription(loaded.seoDescription ?? '');
    setStatus(loaded.status);
    const offer = loaded.variants?.[0]?.sku?.offers?.[0];
    if (offer) {
      setPriceMinor(String(offer.listPriceMinor));
      setCurrency(offer.currency);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof PlatformApiError ? err.message : 'Load failed');
      }
    })();
  }, [params.id]);

  async function onSave(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!can('catalog', 'update')) {
      setError('Missing catalog:update');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const sdk = createBrowserSdk();
      await sdk.adminUpdateProduct(params.id, {
        name,
        shortDescription,
        description,
        ...(seoTitle.trim() ? { seoTitle: seoTitle.trim() } : {}),
        ...(seoDescription.trim()
          ? { seoDescription: seoDescription.trim() }
          : {}),
        status: status as
          | 'DRAFT'
          | 'PENDING_REVIEW'
          | 'ACTIVE'
          | 'INACTIVE'
          | 'ARCHIVED',
      });

      const skuId = product?.variants?.[0]?.sku?.id;
      const offerId = product?.variants?.[0]?.sku?.offers?.[0]?.id;
      const listPriceMinor = Number.parseInt(priceMinor, 10);
      if (skuId && Number.isFinite(listPriceMinor) && listPriceMinor >= 0) {
        if (offerId) {
          await sdk.adminUpdateOffer(offerId, {
            listPriceMinor,
            currency,
            active: true,
          });
        } else {
          await sdk.adminCreateOffer({
            skuId,
            listPriceMinor,
            currency,
            active: true,
          });
        }
      }

      if (imageUrl.trim()) {
        await sdk.adminCreateMedia({
          objectKey: `admin:${params.id}:${String(Date.now())}`,
          mimeType: 'image/jpeg',
          productId: params.id,
          externalUrl: imageUrl.trim(),
          attribution: 'Administrator-managed product image',
          sortOrder: 0,
        });
      }

      await reload();
      setImageUrl('');
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(): Promise<void> {
    if (!can('catalog', 'update')) {
      setError('Missing catalog:update');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createBrowserSdk().adminPublishProduct(params.id);
      await reload();
      setMessage('Published (ACTIVE)');
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Publish failed',
      );
    } finally {
      setBusy(false);
    }
  }

  const offer = product?.variants?.[0]?.sku?.offers?.[0];
  const primaryImage = product?.media?.[0]?.mediaAsset?.externalUrl;

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Edit product</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            {product?.slug ?? '…'} · origin{' '}
            {product?.contentOrigin ?? 'ADMIN'}
          </p>
        </div>
        <button
          className="btn"
          type="button"
          disabled={busy || !can('catalog', 'update')}
          onClick={() => {
            void onPublish();
          }}
        >
          Publish
        </button>
      </div>

      <form
        className="panel stack"
        onSubmit={(e) => {
          void onSave(e);
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>General</h2>
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
          <label htmlFor="desc">Description</label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            rows={5}
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
            }}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Pricing</h2>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Prices are stored on Offers. Checkout never trusts the browser.
          {offer
            ? ` Current: ${formatMoneyMinor(offer.listPriceMinor, offer.currency)}`
            : ' No offer yet — set a price before publishing.'}
        </p>
        <div className="field">
          <label htmlFor="price">List price (minor units, e.g. 6499900 = KSh 64,999.00)</label>
          <input
            id="price"
            inputMode="numeric"
            value={priceMinor}
            onChange={(e) => {
              setPriceMinor(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <input
            id="currency"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value.toUpperCase());
            }}
            maxLength={3}
          />
        </div>

        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Media</h2>
        {primaryImage ? (
          <img
            src={primaryImage}
            alt=""
            style={{ maxWidth: 220, borderRadius: 8 }}
          />
        ) : (
          <p className="muted">No image linked yet.</p>
        )}
        <div className="field">
          <label htmlFor="imageFile">Upload image (JPEG/PNG/WebP/GIF)</label>
          <input
            id="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void (async () => {
                setBusy(true);
                setError(null);
                setMessage(null);
                try {
                  const buffer = await file.arrayBuffer();
                  const bytes = new Uint8Array(buffer);
                  let binary = '';
                  for (const byte of bytes) {
                    binary += String.fromCharCode(byte);
                  }
                  const dataBase64 = btoa(binary);
                  const mimeType =
                    file.type === 'image/png' ||
                    file.type === 'image/webp' ||
                    file.type === 'image/gif'
                      ? file.type
                      : 'image/jpeg';
                  await createBrowserSdk().adminUploadMedia({
                    dataBase64,
                    mimeType,
                    fileName: file.name,
                    productId: params.id,
                    sortOrder: product?.media?.length ?? 0,
                    attribution: 'Administrator upload',
                  });
                  await reload();
                  setMessage('Image uploaded to object storage');
                } catch (err) {
                  setError(
                    err instanceof PlatformApiError
                      ? err.message
                      : 'Upload failed',
                  );
                } finally {
                  setBusy(false);
                  e.target.value = '';
                }
              })();
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="imageUrl">
            Or link an external HTTPS image URL (metadata only)
          </label>
          <input
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
            }}
            placeholder="https://…"
          />
        </div>

        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>SEO</h2>
        <div className="field">
          <label htmlFor="seoTitle">SEO title</label>
          <input
            id="seoTitle"
            value={seoTitle}
            onChange={(e) => {
              setSeoTitle(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="seoDesc">SEO description</label>
          <textarea
            id="seoDesc"
            value={seoDescription}
            onChange={(e) => {
              setSeoDescription(e.target.value);
            }}
          />
        </div>

        {product?.variants?.[0]?.sku ? (
          <p className="muted" style={{ margin: 0 }}>
            SKU: {product.variants[0].sku.internalSku ?? product.variants[0].sku.id}
          </p>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="muted">{message}</p> : null}
        <button
          className="btn"
          type="submit"
          disabled={busy || !can('catalog', 'update')}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
