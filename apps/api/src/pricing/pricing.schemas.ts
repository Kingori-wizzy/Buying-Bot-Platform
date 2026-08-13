import { z } from '@buying-bot/validation';

export const createPromotionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(64).optional(),
  type: z.enum([
    'PERCENT_OFF_ITEM',
    'FIXED_OFF_ITEM',
    'PERCENT_OFF_CART',
    'FIXED_OFF_CART',
  ]),
  percentBps: z.number().int().min(0).max(100_000).optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  stackable: z.boolean().optional(),
  priority: z.number().int().optional(),
  minSpendMinor: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(1).max(64),
  promotionId: z.string().uuid(),
  maxRedemptions: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(64),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  goodsMinor: z.number().int().nonnegative().optional(),
});

export type CreatePromotionBody = z.infer<typeof createPromotionSchema>;
export type CreateCouponBody = z.infer<typeof createCouponSchema>;
export type ValidateCouponBody = z.infer<typeof validateCouponSchema>;
