import type { z } from '@buying-bot/validation';
import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from '@nestjs/common';

export class ZodValidationPipe<
  TSchema extends z.ZodTypeAny,
> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data as z.infer<TSchema>;
  }
}
