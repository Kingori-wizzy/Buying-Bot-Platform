import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CartModule } from '../cart/cart.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';
import { DigitalFulfillmentService } from './digital-fulfillment.service.js';
import { OrdersAdminController } from './orders.admin.controller.js';

@Module({
  imports: [AuthModule, CartModule, PricingModule, InventoryModule],
  controllers: [CheckoutController, OrdersAdminController],
  providers: [CheckoutService, DigitalFulfillmentService],
  exports: [CheckoutService, DigitalFulfillmentService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class CheckoutModule {}
