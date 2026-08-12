import { z } from 'zod';

export { z };

export const nonEmptyString = z.string().trim().min(1);

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Parse unknown input with a Zod schema. Throws a structured Error on failure.
 */
export function parseOrThrow<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
  label = 'Validation',
): z.infer<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`${label} failed: ${issues}`);
  }
  return result.data as z.infer<TSchema>;
}
