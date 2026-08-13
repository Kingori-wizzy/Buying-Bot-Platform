/**
 * Data integrity checks against DATABASE_URL.
 * Exit non-zero on failure. Requires `psql` on PATH.
 *
 * Usage:
 *   DATABASE_URL=... node ./scripts/integrity/check-data-integrity.mjs
 */
import { spawnSync } from 'node:child_process';

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

/** Strip Prisma-only query params (e.g. schema=) that libpq/psql reject. */
function toPsqlUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('schema');
    parsed.searchParams.delete('connection_limit');
    parsed.searchParams.delete('pool_timeout');
    const qs = parsed.searchParams.toString();
    parsed.search = qs ? `?${qs}` : '';
    return parsed.toString();
  } catch {
    return url.replace(/([?&])schema=[^&]*/g, '$1').replace(/[?&]$/, '');
  }
}

const databaseUrl = toPsqlUrl(rawUrl);

function runSql(sql) {
  const result = spawnSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql],
    { encoding: 'utf8' },
  );
  if (result.error) {
    console.error(`psql failed to start: ${result.error.message}`);
    console.error(
      'EXTERNAL: install PostgreSQL client tools, or run against compose with psql available.',
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || 'psql failed');
    process.exit(result.status ?? 1);
  }
  return (result.stdout || '').trim();
}

const checks = [
  {
    name: 'orphan_order_items',
    sql: `SELECT COUNT(*) FROM orders.order_items oi
          LEFT JOIN orders.orders o ON o.id = oi.order_id
          WHERE o.id IS NULL`,
    expectZero: true,
  },
  {
    name: 'orphan_variants',
    sql: `SELECT COUNT(*) FROM catalog.variants v
          LEFT JOIN catalog.products p ON p.id = v.product_id
          WHERE p.id IS NULL`,
    expectZero: true,
  },
  {
    name: 'orphan_skus',
    sql: `SELECT COUNT(*) FROM catalog.skus s
          LEFT JOIN catalog.variants v ON v.id = s.variant_id
          WHERE v.id IS NULL`,
    expectZero: true,
  },
  {
    name: 'orphan_offers',
    sql: `SELECT COUNT(*) FROM catalog.offers o
          LEFT JOIN catalog.skus s ON s.id = o.sku_id
          WHERE s.id IS NULL`,
    expectZero: true,
  },
  {
    name: 'orphan_inventory_balances',
    sql: `SELECT COUNT(*) FROM inventory.inventory_balances b
          LEFT JOIN catalog.skus s ON s.id = b.sku_id
          WHERE s.id IS NULL`,
    expectZero: true,
  },
  {
    name: 'order_payable_vs_snapshot',
    sql: `SELECT COUNT(*) FROM orders.orders o
          INNER JOIN orders.order_financial_snapshots s ON s.order_id = o.id
          WHERE o.payable_minor <> s.payable_minor`,
    expectZero: true,
  },
  {
    name: 'order_line_total_consistency',
    sql: `SELECT COUNT(*) FROM orders.order_items
          WHERE line_total_minor <> (unit_price_minor * quantity - line_discount_minor + tax_minor)`,
    expectZero: true,
  },
  {
    name: 'inventory_reserved_not_negative',
    sql: `SELECT COUNT(*) FROM inventory.inventory_balances
          WHERE reserved < 0 OR on_hand < 0`,
    expectZero: true,
  },
  {
    name: 'inventory_on_hand_gte_reserved',
    sql: `SELECT COUNT(*) FROM inventory.inventory_balances
          WHERE on_hand < reserved`,
    expectZero: true,
  },
  {
    name: 'duplicate_active_sessions_same_token',
    sql: `SELECT COUNT(*) FROM (
            SELECT token_hash FROM identity.sessions
            WHERE revoked_at IS NULL
            GROUP BY token_hash HAVING COUNT(*) > 1
          ) d`,
    expectZero: true,
  },
  {
    name: 'orphan_cart_lines',
    sql: `SELECT COUNT(*) FROM cart.cart_lines cl
          LEFT JOIN cart.carts c ON c.id = cl.cart_id
          WHERE c.id IS NULL`,
    expectZero: true,
  },
  {
    name: 'failed_outbox_visible',
    sql: `SELECT COUNT(*) FROM orders.outbox_messages WHERE status = 'FAILED'`,
    expectZero: false,
  },
];

let failed = 0;
for (const check of checks) {
  const value = runSql(check.sql);
  const count = Number(value);
  const ok = check.expectZero ? count === 0 : Number.isFinite(count);
  if (!ok) {
    console.error(`FAIL ${check.name}: count=${value}`);
    failed += 1;
  } else {
    console.log(`PASS ${check.name}: ${value}`);
  }
}

if (failed > 0) {
  console.error(`Integrity failed: ${failed} check(s)`);
  process.exit(1);
}

console.log('Integrity OK');
