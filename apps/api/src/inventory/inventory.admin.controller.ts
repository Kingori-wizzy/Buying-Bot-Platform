import type { AuthPrincipal } from '@buying-bot/auth';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
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
import {
  type AdjustInventoryBody,
  adjustInventorySchema,
  type ListInventoryQuery,
  listInventoryQuerySchema,
  type ReserveInventoryBody,
  reserveInventorySchema,
} from './inventory.schemas.js';
import { InventoryService } from './inventory.service.js';

@Controller('v1/admin/inventory')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
export class InventoryAdminController {
  constructor(
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}

  @Get()
  @RequirePermissions('inventory:read')
  list(
    @Query(new ZodValidationPipe(listInventoryQuerySchema))
    query: ListInventoryQuery,
  ): Promise<unknown> {
    return this.inventory.list(query);
  }

  @Post('adjust')
  @RequirePermissions('inventory:update')
  adjust(
    @Body(new ZodValidationPipe(adjustInventorySchema))
    body: AdjustInventoryBody,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<unknown> {
    return this.inventory.adjust(body, user.subjectId);
  }
}

/** Internal-style reserve endpoint used by checkout (also admin-callable). */
@Controller('v1/internal/inventory')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
export class InventoryInternalController {
  constructor(
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}

  @Post('reserve')
  @RequirePermissions('inventory:update')
  reserve(
    @Body(new ZodValidationPipe(reserveInventorySchema))
    body: ReserveInventoryBody,
  ): Promise<unknown> {
    return this.inventory.reserve(body);
  }
}
