import {
  type PrismaDatabaseClient,
  requeueFailedOutbox,
} from '@buying-bot/database';
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  CsrfGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
  RealmGuard,
  RequireAnyPermissions,
  RequireMfa,
  RequireRealm,
  SessionAuthGuard,
} from '../auth/guards.js';
import { DATABASE_CLIENT } from '../config/tokens.js';

@Controller('v1/admin')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
export class AdminController {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
  ) {}

  @Get('ping')
  @RequireRealm('admin')
  @RequireMfa()
  @RequireAnyPermissions('system:manage', 'audit:read')
  ping(): { ok: true; realm: 'admin' } {
    return { ok: true, realm: 'admin' };
  }

  @Post('outbox/reprocess')
  @RequireRealm('admin')
  @RequireMfa()
  @RequireAnyPermissions('system:manage')
  async reprocessOutbox(): Promise<{ requeued: number }> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    const requeued = await requeueFailedOutbox(this.database.prisma, 100);
    return { requeued };
  }
}
