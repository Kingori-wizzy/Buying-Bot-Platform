import { z } from '@buying-bot/validation';

export const adjustInventorySchema = z.object({
  skuId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  quantityDelta: z.number().int(),
  reason: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(200),
});

export const listInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  skuId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

export const reserveInventorySchema = z.object({
  skuId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  expiresAt: z.coerce.date(),
  orderId: z.string().uuid().optional(),
  cartId: z.string().uuid().optional(),
  idempotencyKey: z.string().trim().min(1).max(200),
});

export type AdjustInventoryBody = z.infer<typeof adjustInventorySchema>;
export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type ReserveInventoryBody = z.infer<typeof reserveInventorySchema>;
