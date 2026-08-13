'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

export default function CatalogCreatePage() {
  const router = useRouter();
  const { can } = useAdminSession();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!can('catalog', 'create')) {
    return <p className="error">Missing catalog:create (UI gate only).</p>;
  }

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = (await createBrowserSdk().adminCreateProduct({
        name,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        ...(shortDescription.trim()
          ? { shortDescription: shortDescription.trim() }
          : {}),
        status,
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
              setStatus(e.target.value as 'DRAFT' | 'ACTIVE');
            }}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
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
