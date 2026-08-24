import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { DigitalFulfillmentService } from './digital-fulfillment.service.js';

describe('DigitalFulfillmentService', () => {
  it('rejects sensitive payload keys before persistence', async () => {
    const service = new DigitalFulfillmentService(null);
    await expect(
      service.markReady('00000000-0000-4000-8000-000000000001', {
        password: 'should-not-store',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    try {
      await service.markReady('00000000-0000-4000-8000-000000000001', {
        api_key: 'x',
      });
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as {
        code?: string;
      };
      expect(response.code).toBe('SENSITIVE_PAYLOAD_REJECTED');
    }
  });
});
