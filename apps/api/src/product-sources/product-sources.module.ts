import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ProductSourcesAdminController } from './product-sources.admin.controller.js';
import { ProductSourcesService } from './product-sources.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ProductSourcesAdminController],
  providers: [ProductSourcesService],
  exports: [ProductSourcesService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class ProductSourcesModule {}
