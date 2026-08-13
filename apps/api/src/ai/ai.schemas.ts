import { z } from '@buying-bot/validation';

export const chatBodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(12_000),
});

export const retrieveBodySchema = z.object({
  query: z.string().trim().min(1).max(2_000),
  embedding: z.array(z.number().finite()).max(1536).optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const toolArgsSchema = z.record(z.string(), z.unknown()).default({});

export type ChatBody = z.infer<typeof chatBodySchema>;
export type RetrieveBody = z.infer<typeof retrieveBodySchema>;
export type ToolArgs = z.infer<typeof toolArgsSchema>;
