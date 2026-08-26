'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useCallback, useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface SourceRow {
  code?: string;
  name?: string;
  active?: boolean;
  id?: string;
  [key: string]: unknown;
}

export default function ProductSourcesPage() {
  const { can } = useAdminSession();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [stats, setStats] = useState<unknown>(null);
  const [runs, setRuns] = useState<unknown[]>([]);
  const [quarantine, setQuarantine] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const body = await createBrowserSdk().adminListProductSources();
      const items = Array.isArray(body)
        ? body
        : ((body as { items?: SourceRow[] }).items ?? []);
      setSources(items as SourceRow[]);
      if (!selected && items.length > 0) {
        const code = String(
          (items[0] as SourceRow).code ?? (items[0] as SourceRow).id ?? '',
        );
        setSelected(code);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Failed to load product sources',
      );
    }
  }, [selected]);

  const loadDetail = useCallback(async (code: string) => {
    if (!code) return;
    try {
      const sdk = createBrowserSdk();
      const [s, r, q] = await Promise.all([
        sdk.adminProductSourceStats(code),
        sdk.adminProductSourceSyncRuns(code),
        sdk.adminProductSourceQuarantine(code),
      ]);
      setStats(s);
      setRuns(Array.isArray(r) ? r : ((r as { items?: unknown[] }).items ?? []));
      setQuarantine(
        Array.isArray(q) ? q : ((q as { items?: unknown[] }).items ?? []),
      );
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Failed to load source detail',
      );
    }
  }, []);

  useEffect(() => {
    if (!can('catalog', 'read')) return;
    void loadSources();
  }, [can, loadSources]);

  useEffect(() => {
    if (!selected) return;
    void loadDetail(selected);
  }, [selected, loadDetail]);

  async function triggerSync() {
    if (!selected || !can('catalog', 'update')) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await createBrowserSdk().adminTriggerProductSourceSync(
        selected,
      );
      setMessage(`Sync queued: ${result.syncRunId}`);
      await loadDetail(selected);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Sync trigger failed',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!can('catalog', 'read')) {
    return <p className="error">Missing catalog:read</p>;
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Product sources</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            External source sync status, quarantine, and manual trigger. Catalog
            writes still go through provenance/quarantine.
          </p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}

      <div className="panel stack">
        <label htmlFor="source">Source</label>
        <select
          id="source"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
          }}
        >
          <option value="">— select —</option>
          {sources.map((source) => {
            const code = String(source.code ?? source.id ?? '');
            return (
              <option key={code} value={code}>
                {String(source.name ?? code)}
              </option>
            );
          })}
        </select>
        {can('catalog', 'update') ? (
          <button
            className="btn"
            type="button"
            disabled={busy || !selected}
            onClick={() => void triggerSync()}
          >
            {busy ? 'Triggering…' : 'Trigger sync'}
          </button>
        ) : null}
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Stats</h2>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
          {stats ? JSON.stringify(stats, null, 2) : '—'}
        </pre>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Recent sync runs</h2>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
          {JSON.stringify(runs.slice(0, 10), null, 2)}
        </pre>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Quarantine</h2>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
          {JSON.stringify(quarantine.slice(0, 20), null, 2)}
        </pre>
      </div>
    </section>
  );
}
