import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CsrfGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
  RealmGuard,
  RequireMfa,
  RequirePermissions,
  RequireRealm,
  SessionAuthGuard,
} from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  type PatchProductSourceBody,
  patchProductSourceSchema,
} from './product-sources.schemas.js';
import { ProductSourcesService } from './product-sources.service.js';

@Controller('v1/admin/product-sources')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
export class ProductSourcesAdminController {
  constructor(
    @Inject(ProductSourcesService)
    private readonly sources: ProductSourcesService,
  ) {}

  @Get()
  @RequirePermissions('catalog:read')
  list(): Promise<unknown> {
    return this.sources.listSources();
  }

  @Get(':code/stats')
  @RequirePermissions('catalog:read')
  stats(@Param('code') code: string): Promise<unknown> {
    return this.sources.getSourceStats(code);
  }

  @Get(':code/quarantine')
  @RequirePermissions('catalog:read')
  quarantine(
    @Param('code') code: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.sources.listQuarantined(
      code,
      limit ? Number.parseInt(limit, 10) : 50,
    );
  }

  @Patch(':code')
  @RequirePermissions('catalog:update')
  patch(
    @Param('code') code: string,
    @Body(new ZodValidationPipe(patchProductSourceSchema))
    body: PatchProductSourceBody,
  ): Promise<unknown> {
    return this.sources.patchSource(code, body);
  }

  @Post(':code/sync')
  @RequirePermissions('catalog:update')
  triggerSync(@Param('code') code: string): Promise<{ syncRunId: string }> {
    return this.sources.triggerSync(code);
  }

  @Get(':code/sync-runs')
  @RequirePermissions('catalog:read')
  syncRuns(@Param('code') code: string): Promise<unknown> {
    return this.sources.listSyncRuns(code);
  }
}
