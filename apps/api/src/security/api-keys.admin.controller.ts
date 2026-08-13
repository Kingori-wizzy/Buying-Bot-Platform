import type { AuthPrincipal } from '@buying-bot/auth';
import { z } from '@buying-bot/validation';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  CsrfGuard,
  CurrentUser,
  MfaSatisfiedGuard,
  PermissionsGuard,
  RealmGuard,
  RequireMfa,
  RequirePermissions,
  RequireRealm,
  SessionAuthGuard,
} from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ApiKeysService } from './api-keys.service.js';

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.string().trim().min(1)).min(1).max(50),
  organizationId: z.string().uuid().optional(),
});
type CreateApiKeyBody = z.infer<typeof createApiKeySchema>;

@Controller('v1/admin/security/api-keys')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
@RequirePermissions('system:manage')
export class ApiKeysAdminController {
  constructor(
    @Inject(ApiKeysService) private readonly apiKeys: ApiKeysService,
  ) {}

  @Post()
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyBody,
  ): Promise<unknown> {
    return this.apiKeys.create({
      name: body.name,
      scopes: body.scopes,
      createdBy: principal.subjectId,
      ...(body.organizationId ? { organizationId: body.organizationId } : {}),
    });
  }

  @Get()
  list(): Promise<unknown> {
    return this.apiKeys.list();
  }

  @Post(':id/revoke')
  revoke(@Param('id') id: string): Promise<unknown> {
    return this.apiKeys.revoke(id);
  }
}
