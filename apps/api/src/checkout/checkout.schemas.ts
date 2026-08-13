import { z } from '@buying-bot/validation';

export const checkoutBodySchema = z.object({
  msisdnE164: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'MSISDN must be E.164'),
  couponCode: z.string().trim().min(1).max(64).optional(),
  shippingMethodCode: z.string().trim().min(1).max(64).optional(),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
