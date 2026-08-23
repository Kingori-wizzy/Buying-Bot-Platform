import { z } from '@buying-bot/validation';

export const checkoutBodySchema = z.object({
  /** Optional — only for deferred M-Pesa rail; escrow does not use MSISDN. */
  msisdnE164: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'MSISDN must be E.164')
    .optional(),
  couponCode: z.string().trim().min(1).max(64).optional(),
  shippingMethodCode: z.string().trim().min(1).max(64).optional(),
  returnUrl: z.string().trim().url().optional(),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
