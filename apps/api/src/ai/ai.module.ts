import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ServiceJwtGuard } from '../auth/service-jwt.guard.js';
import { CartModule } from '../cart/cart.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CheckoutModule } from '../checkout/checkout.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiToolsController } from './ai.tools.controller.js';

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    InventoryModule,
    PricingModule,
    CartModule,
    CheckoutModule,
  ],
  controllers: [AiController, AiToolsController],
  providers: [AiService, ServiceJwtGuard],
  exports: [AiService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class AiModule {}
