import { z } from '@buying-bot/validation';

export const cartLineBodySchema = z.object({
  offerId: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
});

export const updateCartLineSchema = z.object({
  quantity: z.number().int().positive().max(100),
});

export type CartLineBody = z.infer<typeof cartLineBodySchema>;
export type UpdateCartLineBody = z.infer<typeof updateCartLineSchema>;
