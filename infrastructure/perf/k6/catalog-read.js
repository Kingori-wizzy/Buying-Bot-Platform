import { check, sleep } from 'k6';
import http from 'k6/http';

/**
 * ASPIRATIONAL catalog read smoke (ADR-0020).
 * Targets are aspirational — do not treat failures as release blockers yet.
 *
 * Run:
 *   k6 run -e BASE_URL=http://127.0.0.1:3000 infrastructure/perf/k6/catalog-read.js
 */
export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000';

export default function catalogRead() {
  const res = http.get(`${BASE}/v1/products?page=1&pageSize=10`);
  check(res, {
    'status 200': (r) => r.status === 200,
  });
  sleep(0.5);
}
