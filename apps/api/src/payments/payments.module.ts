import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsWebhookController } from './payments.webhook.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class PaymentsModule {}
