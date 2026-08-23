/**
 * Mark a PENDING_PAYMENT order PAID using the local sandbox webhook path
 * (no live Daraja / shortcode required).
 *
 * Usage:
 *   node scripts/dev/simulate-mpesa-webhook.mjs <orderId> [amountMinor]
 *
 * amountMinor is optional if the order is guest (no userId). For logged-in
 * checkout, copy payableMinor from the order page URL bar / API response.
 */
const base = (process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const orderId = process.argv[2]?.trim();
const amountArg = process.argv[3]?.trim();

if (!orderId) {
  console.error(
    'Usage: node scripts/dev/simulate-mpesa-webhook.mjs <orderId> [amountMinor]',
  );
  process.exit(1);
}

async function resolvePayableMinor() {
  if (amountArg && /^\d+$/.test(amountArg)) {
    return Number(amountArg);
  }
  const orderRes = await fetch(
    `${base}/v1/orders/${encodeURIComponent(orderId)}`,
    { headers: { accept: 'application/json' } },
  );
  if (orderRes.status === 403) {
    console.error(
      'Order requires login. Pass amountMinor as 2nd arg (payableMinor from checkout/order page).',
    );
    process.exit(1);
  }
  if (!orderRes.ok) {
    console.error(`Order fetch failed: HTTP ${orderRes.status}`);
    process.exit(1);
  }
  const order = await orderRes.json();
  if (typeof order.payableMinor === 'number') return order.payableMinor;
  if (typeof order.totalMinor === 'number') return order.totalMinor;
  console.error('Could not resolve payableMinor — pass it as 2nd argument');
  process.exit(1);
}

async function main() {
  const payableMinor = await resolvePayableMinor();
  const ts = String(Date.now());
  const payload = {
    eventId: `manual-${ts}`,
    orderId,
    providerTxnId: `sandbox_manual_${ts}`,
    amountMinor: payableMinor,
    currency: 'KES',
    Body: {
      stkCallback: {
        ResultCode: 0,
        CheckoutRequestID: `ws_manual_${ts}`,
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: payableMinor / 100 },
            { Name: 'MpesaReceiptNumber', Value: `SANDBOX${ts}` },
          ],
        },
      },
    },
  };

  const webhookRes = await fetch(`${base}/v1/webhooks/payments/mpesa`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (![200, 201, 202].includes(webhookRes.status)) {
    const text = await webhookRes.text();
    console.error(`Webhook rejected: HTTP ${webhookRes.status} ${text}`);
    process.exit(1);
  }
  console.log('Sandbox webhook accepted');

  for (let i = 0; i < 12; i += 1) {
    await new Promise((r) => setTimeout(r, 250));
    const poll = await fetch(
      `${base}/v1/orders/${encodeURIComponent(orderId)}`,
      { headers: { accept: 'application/json' } },
    );
    if (!poll.ok) continue;
    const next = await poll.json();
    if (next.status === 'PAID') {
      console.log(`Order ${orderId} is PAID`);
      return;
    }
  }
  console.error('Webhook accepted but order did not become PAID (check worker logs)');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
