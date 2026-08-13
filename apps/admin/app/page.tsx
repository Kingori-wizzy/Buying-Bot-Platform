'use client';

import { useAdminSession } from '@/components/AdminShell';

export default function AdminHomePage() {
  const { me, loading } = useAdminSession();

  if (loading) {
    return <p className="muted">Loading session…</p>;
  }

  return (
    <section className="stack">
      <h1>Dashboard</h1>
      <p className="muted">
        Admin UI is UX-only. Mutations are authorized by Nest guards.
      </p>
      {me ? (
        <div className="panel stack">
          <p>
            <strong>Subject</strong> {me.subjectId}
          </p>
          <p>
            <strong>Roles</strong> {me.roles.join(', ') || '—'}
          </p>
          <p>
            <strong>MFA</strong> {me.mfaSatisfied ? 'satisfied' : 'required'}
          </p>
          <p>
            <strong>Permissions</strong>{' '}
            {me.permissions
              .map((p) => `${p.resource}:${p.action}`)
              .join(', ') || '—'}
          </p>
        </div>
      ) : null}
    </section>
  );
}
