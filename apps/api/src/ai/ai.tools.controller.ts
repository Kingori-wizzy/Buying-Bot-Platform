import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Public, SkipCsrf } from '../auth/guards.js';
import { ServiceJwtGuard } from '../auth/service-jwt.guard.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { type ToolArgs, toolArgsSchema } from './ai.schemas.js';
import { AiService } from './ai.service.js';

@Controller('v1/ai/tools')
@Public()
@SkipCsrf()
@UseGuards(ServiceJwtGuard)
export class AiToolsController {
  constructor(@Inject(AiService) private readonly ai: AiService) {}

  @Post(':toolName')
  execute(
    @Param('toolName') toolName: string,
    @Headers('x-acting-subject') actingSubject: string | undefined,
    @Headers('x-acting-realm') actingRealm: string | undefined,
    @Body(new ZodValidationPipe(toolArgsSchema)) args: ToolArgs,
  ): Promise<unknown> {
    if (!actingSubject) {
      throw new BadRequestException({
        code: 'ACTING_SUBJECT_REQUIRED',
        message: 'x-acting-subject header is required',
      });
    }
    if (
      actingRealm !== undefined &&
      !['customer', 'admin'].includes(actingRealm)
    ) {
      throw new BadRequestException({
        code: 'INVALID_ACTING_REALM',
        message: 'x-acting-realm must be customer or admin',
      });
    }
    return this.ai.executeTool(
      toolName,
      args,
      actingSubject,
      actingRealm === 'admin' ? 'admin' : 'customer',
    );
  }
}
