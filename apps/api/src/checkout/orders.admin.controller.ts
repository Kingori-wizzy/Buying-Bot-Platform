import { z } from '@buying-bot/validation';
import {
  Controller,
  Get,
  Inject,
  Param,
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
import { CheckoutService } from './checkout.service.js';

@Controller('v1/admin/orders')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
export class OrdersAdminController {
  constructor(
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
  ) {}

  @Get()
  @RequirePermissions('orders:read')
  list(
    @Query(
      new ZodValidationPipe(
        z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          status: z.string().trim().min(1).optional(),
        }),
      ),
    )
    query: {
      page: number;
      pageSize: number;
      status?: string;
    },
  ): Promise<unknown> {
    return this.checkout.adminListOrders(query);
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  get(@Param('id') id: string): Promise<unknown> {
    return this.checkout.adminGetOrder(id);
  }
}
