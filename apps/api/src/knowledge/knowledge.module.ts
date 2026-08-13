import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { KnowledgeAdminController } from './knowledge.admin.controller.js';
import { KnowledgeService } from './knowledge.service.js';

@Module({
  imports: [AuthModule],
  controllers: [KnowledgeAdminController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class KnowledgeModule {}
