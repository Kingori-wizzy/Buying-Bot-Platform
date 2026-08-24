import { BadRequestException } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';

import { ProductSourcesService } from './product-sources.service.js';

describe('ProductSourcesService marketplace gate', () => {
  const previous = process.env.MARKETPLACE_INGESTION_ENABLED;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.MARKETPLACE_INGESTION_ENABLED;
    } else {
      process.env.MARKETPLACE_INGESTION_ENABLED = previous;
    }
  });

  it('refuses sync when marketplace ingestion is disabled', async () => {
    delete process.env.MARKETPLACE_INGESTION_ENABLED;
    const service = new ProductSourcesService(null);
    await expect(
      service.triggerSync('mock-marketplace'),
    ).rejects.toBeInstanceOf(BadRequestException);
    try {
      await service.triggerSync('mock-marketplace');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        code?: string;
      };
      expect(response.code).toBe('MARKETPLACE_INGESTION_DISABLED');
    }
  });
});
