import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import {
  PricingAdminController,
  PricingPublicController,
} from './pricing.controller.js';
import { PricingService } from './pricing.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PricingAdminController, PricingPublicController],
  providers: [PricingService],
  exports: [PricingService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class PricingModule {}
