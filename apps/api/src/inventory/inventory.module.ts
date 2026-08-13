import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import {
  InventoryAdminController,
  InventoryInternalController,
} from './inventory.admin.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [AuthModule],
  controllers: [InventoryAdminController, InventoryInternalController],
  providers: [InventoryService],
  exports: [InventoryService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class InventoryModule {}
