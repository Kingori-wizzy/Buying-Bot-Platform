'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AdminOrdersPage() {
  const [orderId, setOrderId] = useState('');

  return (
    <section className="stack">
      <h1>Orders</h1>
      <p className="muted">
        There is no admin order-list API yet. Look up an order by id (GET
        /v1/orders/:id). Mutations remain API-authorized.
      </p>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="field">
          <label htmlFor="orderId">Order id</label>
          <input
            id="orderId"
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value);
            }}
            placeholder="uuid"
          />
        </div>
        {orderId.trim() ? (
          <Link className="btn" href={`/orders/${orderId.trim()}`}>
            Open detail
          </Link>
        ) : (
          <button className="btn" type="button" disabled>
            Open detail
          </button>
        )}
      </form>
    </section>
  );
}
