import { z } from '@buying-bot/validation';

export const patchProductSourceSchema = z.object({
  enabled: z.boolean().optional(),
  status: z
    .enum([
      'ACTIVE',
      'PAUSED',
      'DEGRADED',
      'FAILED',
      'NOT_CONFIGURED',
      'DISABLED',
      'ERROR',
    ])
    .optional(),
  syncIntervalMinutes: z.number().int().positive().max(10_080).optional(),
});

export type PatchProductSourceBody = z.infer<typeof patchProductSourceSchema>;
