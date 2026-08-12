import { describe, expect, it } from 'vitest';

import {
  nonEmptyString,
  paginationQuerySchema,
  parseOrThrow,
} from './index.js';

describe('@buying-bot/validation', () => {
  it('rejects empty strings', () => {
    expect(() => parseOrThrow(nonEmptyString, '  ', 'name')).toThrow(
      /name failed/,
    );
  });

  it('applies pagination defaults', () => {
    const parsed = parseOrThrow(paginationQuerySchema, {});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });
});
