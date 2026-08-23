import { describe, expect, it } from 'vitest';

import { parseCatalogCsv } from './catalog-csv.js';

describe('parseCatalogCsv', () => {
  it('parses valid rows and rejects blank names', () => {
    const csv = [
      'name,internalSku,listPriceMinor,currency,initialStock',
      'Laptop A,SKU-A,100000,KES,3',
      ',SKU-B,200000,KES,1',
    ].join('\n');
    const result = parseCatalogCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.name).toBe('Laptop A');
    expect(result.rows[0]?.listPriceMinor).toBe(100000);
    expect(result.errors.some((e) => e.error.includes('name'))).toBe(true);
  });

  it('requires a header and data row', () => {
    const result = parseCatalogCsv('name\n');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
