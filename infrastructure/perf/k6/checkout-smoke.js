import { check, sleep } from 'k6';
import http from 'k6/http';

/**
 * ASPIRATIONAL checkout smoke (ADR-0020).
 * Does not complete real M-Pesa payment — health + public catalog only unless
 * AUTH_COOKIE is provided for authenticated cart flows.
 *
 * Run:
 *   k6 run -e BASE_URL=http://127.0.0.1:3000 infrastructure/perf/k6/checkout-smoke.js
 */
export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000';

export default function checkoutSmoke() {
  const health = http.get(`${BASE}/health/ready`);
  check(health, { 'ready 200': (r) => r.status === 200 });

  const products = http.get(`${BASE}/v1/products?page=1&pageSize=5`);
  check(products, { 'products 200': (r) => r.status === 200 });
  sleep(1);
}
