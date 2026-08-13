import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

@Module({
  imports: [AuthModule, PricingModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class CartModule {}
