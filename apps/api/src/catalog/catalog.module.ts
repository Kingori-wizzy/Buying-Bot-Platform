import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CatalogAdminController } from './catalog.admin.controller.js';
import { CatalogPublicController } from './catalog.public.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CatalogPublicController, CatalogAdminController],
  providers: [CatalogService],
  exports: [CatalogService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class CatalogModule {}
