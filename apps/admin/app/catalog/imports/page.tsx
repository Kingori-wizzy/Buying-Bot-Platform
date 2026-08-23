'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface ImportSummary {
  id: string;
  filename: string;
  status: string;
  dryRun: boolean;
  rowsTotal: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsRejected: number;
  createdAt: string;
}

export default function CatalogImportsPage() {
  const { can } = useAdminSession();
  const [filename, setFilename] = useState('products.csv');
  const [csvText, setCsvText] = useState(
    'name,slug,shortDescription,brand,category,internalSku,listPriceMinor,currency,initialStock,status\n' +
      'Demo Laptop Pro,demo-laptop-pro,16GB RAM laptop,Acme,laptops,SKU-DEMO-LAPTOP,8999900,KES,5,DRAFT\n',
  );
  const [dryRun, setDryRun] = useState(true);
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(): Promise<void> {
    const list = (await createBrowserSdk().adminListCatalogImports()) as ImportSummary[];
    setImports(Array.isArray(list) ? list : []);
  }

  useEffect(() => {
    void refresh().catch(() => {
      /* ignore until authorized */
    });
  }, []);

  if (!can('catalog', 'create') && !can('catalog', 'read')) {
    return <p className="error">Missing catalog permissions.</p>;
  }

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!can('catalog', 'create')) {
      setError('Missing catalog:create');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await createBrowserSdk().adminSubmitCatalogImport({
        filename,
        csvText,
        dryRun,
      });
      setResult(response);
      await refresh();
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Product imports</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            CSV bulk upload for administrator-managed products. Bad rows are
            rejected — never silently imported.
          </p>
        </div>
        <Link className="btn btn-secondary" href="/catalog">
          Back to products
        </Link>
      </div>

      <form
        className="panel stack"
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <div className="field">
          <label htmlFor="filename">Filename</label>
          <input
            id="filename"
            value={filename}
            onChange={(e) => {
              setFilename(e.target.value);
            }}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="csv">CSV text</label>
          <textarea
            id="csv"
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
            }}
            rows={10}
            required
          />
        </div>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => {
              setDryRun(e.target.checked);
            }}
          />
          Dry run (validate only — no catalog writes)
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy || !can('catalog', 'create')}>
          {busy ? 'Submitting…' : dryRun ? 'Validate CSV' : 'Commit import'}
        </button>
      </form>

      {result ? (
        <pre className="panel" style={{ overflow: 'auto', fontSize: '0.85rem' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Status</th>
              <th>Total</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Rejected</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((row) => (
              <tr key={row.id}>
                <td>{row.filename}</td>
                <td>
                  <span className="badge">{row.status}</span>
                  {row.dryRun ? ' · dry-run' : ''}
                </td>
                <td>{row.rowsTotal}</td>
                <td>{row.rowsCreated}</td>
                <td>{row.rowsUpdated}</td>
                <td>{row.rowsRejected}</td>
                <td>{new Date(row.createdAt).toLocaleString('en-KE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
