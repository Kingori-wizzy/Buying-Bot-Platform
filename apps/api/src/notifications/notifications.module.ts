import { Module } from '@nestjs/common';

import {
  ConsoleSmsProvider,
  RecordingEmailProvider,
  StubWhatsAppProvider,
} from './notification.ports.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  providers: [
    NotificationsService,
    RecordingEmailProvider,
    ConsoleSmsProvider,
    StubWhatsAppProvider,
  ],
  exports: [NotificationsService, RecordingEmailProvider],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class NotificationsModule {}
