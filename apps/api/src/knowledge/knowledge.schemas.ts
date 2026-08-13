import { z } from '@buying-bot/validation';

export const ingestKnowledgeSchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(2_000_000),
  sourceType: z.string().trim().min(1).max(80).default('manual'),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const listKnowledgeSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']).optional(),
});

export type IngestKnowledgeBody = z.infer<typeof ingestKnowledgeSchema>;
export type ListKnowledgeQuery = z.infer<typeof listKnowledgeSchema>;
