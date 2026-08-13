'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

interface OrderView {
  readonly id: string;
  readonly status: string;
  readonly currency?: string;
  readonly financialSnapshot?: {
    readonly grandTotalMinor?: number;
    readonly currency?: string;
  } | null;
  readonly payments?: readonly {
    readonly status: string;
    readonly provider?: string;
  }[];
}

function paymentTone(status: string | undefined): 'pending' | 'failed' | 'ok' {
  if (!status) return 'pending';
  const normalized = status.toUpperCase();
  if (['PAID', 'SUCCEEDED', 'SUCCESS', 'COMPLETED'].includes(normalized)) {
    return 'ok';
  }
  if (['FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(normalized)) {
    return 'failed';
  }
  return 'pending';
}

export default function OrderStatusPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const load = useCallback(async () => {
    try {
      const next = (await createBrowserSdk().getOrder(orderId)) as OrderView;
      setOrder(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Order load failed',
      );
    }
  }, [orderId]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => {
      void load();
    }, 4000);
    const tick = window.setInterval(() => {
      setElapsedSec((value) => value + 1);
    }, 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [load]);

  const totalMinor = order?.financialSnapshot?.grandTotalMinor;
  const currency =
    order?.financialSnapshot?.currency ?? order?.currency ?? 'KES';
  const paymentStatus = order?.payments?.[0]?.status;
  const tone = paymentTone(paymentStatus ?? order?.status);

  return (
    <main className="page" id="main">
      <section className="stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
          M-Pesa payment
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Waiting for authoritative payment status from the API (polled every
          4s). Do not treat this page alone as paid.
        </p>

        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
            <div className="cta-row" style={{ marginTop: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => void load()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {!order && !error ? (
          <div className="skeleton" style={{ height: 160 }} />
        ) : null}

        {order ? (
          <div className="panel stack">
            <span
              className={
                tone === 'ok'
                  ? 'status-chip'
                  : tone === 'failed'
                    ? 'status-chip failed'
                    : 'status-chip pending'
              }
            >
              {paymentStatus ?? order.status}
            </span>
            <p style={{ margin: 0 }}>
              <strong>Order</strong> {order.id}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Order status</strong> {order.status}
            </p>
            {typeof totalMinor === 'number' ? (
              <p className="price" style={{ fontSize: '1.4rem', margin: 0 }}>
                Amount {formatMoneyMinor(totalMinor, currency)}
              </p>
            ) : null}

            {tone === 'pending' ? (
              <div className="alert alert-warning">
                <strong>Waiting for M-Pesa confirmation…</strong>
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                  Check your phone for the STK Push when payments are enabled.
                  Elapsed {elapsedSec}s. If nothing arrives, keep this page open
                  or retry after confirming Daraja credentials on the server.
                </p>
              </div>
            ) : null}

            {tone === 'ok' ? (
              <div className="alert alert-success">
                Payment confirmed by the server. Thank you.
              </div>
            ) : null}

            {tone === 'failed' ? (
              <div className="alert alert-error" role="alert">
                Payment did not complete. You can return to checkout and retry
                with a fresh order.
                <div className="cta-row" style={{ marginTop: '0.75rem' }}>
                  <Link className="btn" href="/checkout">
                    Retry checkout
                  </Link>
                </div>
              </div>
            ) : null}

            {tone === 'pending' && elapsedSec > 120 ? (
              <div className="alert">
                Still pending after 2 minutes. This can mean the provider timed
                out, payments are disabled (`PAYMENTS_ENABLED=false`), or the
                webhook has not arrived yet. Status remains whatever the API
                reports.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="cta-row">
          <Link className="btn btn-secondary" href="/orders">
            My orders
          </Link>
          <Link className="btn btn-secondary" href="/products">
            Continue shopping
          </Link>
        </div>
      </section>
    </main>
  );
}
