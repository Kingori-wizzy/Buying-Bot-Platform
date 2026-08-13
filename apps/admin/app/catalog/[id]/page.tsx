'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

export default function CatalogEditPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAdminSession();
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const product = (await createBrowserSdk().adminGetProduct(
          params.id,
        )) as {
          name: string;
          shortDescription?: string | null;
          status: string;
        };
        setName(product.name);
        setShortDescription(product.shortDescription ?? '');
        setStatus(product.status);
      } catch (err) {
        setError(err instanceof PlatformApiError ? err.message : 'Load failed');
      }
    })();
  }, [params.id]);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!can('catalog', 'update')) {
      setError('Missing catalog:update');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createBrowserSdk().adminUpdateProduct(params.id, {
        name,
        shortDescription,
        status: status as
          'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
      });
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <h1>Edit product</h1>
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
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="muted">{message}</p> : null}
        <button
          className="btn"
          type="submit"
          disabled={busy || !can('catalog', 'update')}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>
  );
}
