'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useCallback, useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface CreatedRow {
  readonly kind: 'promotion' | 'coupon';
  readonly payload: unknown;
}

export default function PromotionsPage() {
  const { can } = useAdminSession();
  const [name, setName] = useState('');
  const [type, setType] = useState<
    | 'PERCENT_OFF_ITEM'
    | 'FIXED_OFF_ITEM'
    | 'PERCENT_OFF_CART'
    | 'FIXED_OFF_CART'
  >('PERCENT_OFF_CART');
  const [percentBps, setPercentBps] = useState('1000');
  const [couponCode, setCouponCode] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [promotions, setPromotions] = useState<unknown[]>([]);
  const [coupons, setCoupons] = useState<unknown[]>([]);
  const [created, setCreated] = useState<CreatedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const sdk = createBrowserSdk();
      const [p, c] = await Promise.all([
        sdk.adminListPromotions(),
        sdk.adminListCoupons(),
      ]);
      setPromotions(
        Array.isArray(p) ? p : ((p as { items?: unknown[] }).items ?? []),
      );
      setCoupons(
        Array.isArray(c) ? c : ((c as { items?: unknown[] }).items ?? []),
      );
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Failed to load pricing',
      );
    }
  }, []);

  useEffect(() => {
    if (!can('catalog', 'read') && !can('catalog', 'create')) return;
    void reload();
  }, [can, reload]);

  if (!can('catalog', 'create') && !can('catalog', 'read')) {
    return <p className="error">Missing catalog permissions for promo tools.</p>;
  }

  async function createPromotion(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!can('catalog', 'create')) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await createBrowserSdk().adminCreatePromotion({
        name,
        type,
        ...(type.startsWith('PERCENT')
          ? { percentBps: Number(percentBps) }
          : { amountMinor: Number(percentBps) }),
        active: true,
      });
      setCreated((rows) => [{ kind: 'promotion', payload }, ...rows]);
      const id = (payload as { id?: string }).id;
      if (id) setPromotionId(id);
      await reload();
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Promotion create failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function createCoupon(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!can('catalog', 'create')) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await createBrowserSdk().adminCreateCoupon({
        code: couponCode.trim(),
        promotionId: promotionId.trim(),
      });
      setCreated((rows) => [{ kind: 'coupon', payload }, ...rows]);
      await reload();
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Coupon create failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <h1>Promotions / coupons</h1>
      <p className="muted">
        Pricing rules are stored and evaluated by the API. Listing and create
        both go through `/v1/admin/pricing`.
      </p>

      {error ? <p className="error">{error}</p> : null}

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Existing promotions</h2>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
          {JSON.stringify(promotions, null, 2)}
        </pre>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Existing coupons</h2>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
          {JSON.stringify(coupons, null, 2)}
        </pre>
      </div>

      {can('catalog', 'create') ? (
        <>
          <form
            className="panel"
            onSubmit={(e) => {
              void createPromotion(e);
            }}
          >
            <h2>Create promotion</h2>
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
              <label htmlFor="type">Type</label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as typeof type);
                }
                }
              >
                <option value="PERCENT_OFF_CART">PERCENT_OFF_CART</option>
                <option value="PERCENT_OFF_ITEM">PERCENT_OFF_ITEM</option>
                <option value="FIXED_OFF_CART">FIXED_OFF_CART</option>
                <option value="FIXED_OFF_ITEM">FIXED_OFF_ITEM</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="value">
                {type.startsWith('PERCENT') ? 'Percent BPS' : 'Amount minor'}
              </label>
              <input
                id="value"
                value={percentBps}
                onChange={(e) => {
                  setPercentBps(e.target.value);
                }}
                required
              />
            </div>
            <button className="btn" type="submit" disabled={busy}>
              Create promotion
            </button>
          </form>

          <form
            className="panel"
            onSubmit={(e) => {
              void createCoupon(e);
            }}
          >
            <h2>Create coupon</h2>
            <div className="field">
              <label htmlFor="promoId">Promotion id</label>
              <input
                id="promoId"
                value={promotionId}
                onChange={(e) => {
                  setPromotionId(e.target.value);
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="code">Code</label>
              <input
                id="code"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                }}
                required
              />
            </div>
            <button className="btn" type="submit" disabled={busy}>
              Create coupon
            </button>
          </form>
        </>
      ) : null}

      {created.length > 0 ? (
        <div className="panel">
          <h2>Created this session</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {JSON.stringify(created, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
