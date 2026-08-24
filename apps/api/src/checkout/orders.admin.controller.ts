import { z } from '@buying-bot/validation';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
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
import { CheckoutService } from './checkout.service.js';
import { DigitalFulfillmentService } from './digital-fulfillment.service.js';

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
    @Inject(DigitalFulfillmentService)
    private readonly fulfillment: DigitalFulfillmentService,
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

  @Get(':id/fulfillments')
  @RequirePermissions('orders:read')
  listFulfillments(@Param('id') id: string): Promise<unknown> {
    return this.fulfillment.listForOrder(id, { includePayload: true });
  }

  @Post('fulfillments/:fulfillmentId/ready')
  @RequirePermissions('orders:update')
  markReady(
    @Param('fulfillmentId') fulfillmentId: string,
    @Body()
    body: { payload?: Record<string, unknown> },
  ): Promise<unknown> {
    return this.fulfillment.markReady(fulfillmentId, body.payload ?? {});
  }

  @Post('fulfillments/:fulfillmentId/delivered')
  @RequirePermissions('orders:update')
  markDelivered(
    @Param('fulfillmentId') fulfillmentId: string,
  ): Promise<unknown> {
    return this.fulfillment.markDelivered(fulfillmentId);
  }
}
