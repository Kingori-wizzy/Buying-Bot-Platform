import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ApiKeysAdminController } from './api-keys.admin.controller.js';
import { ApiKeysService } from './api-keys.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ApiKeysAdminController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class SecurityModule {}
