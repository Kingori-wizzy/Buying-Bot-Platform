import { Module } from '@nestjs/common';

import { AdminController } from '../admin/admin.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  CsrfGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
  RealmGuard,
  SessionAuthGuard,
} from './guards.js';

@Module({
  controllers: [AuthController, AdminController],
  providers: [
    AuthService,
    SessionAuthGuard,
    PermissionsGuard,
    RealmGuard,
    MfaSatisfiedGuard,
    CsrfGuard,
  ],
  exports: [
    AuthService,
    SessionAuthGuard,
    PermissionsGuard,
    RealmGuard,
    MfaSatisfiedGuard,
    CsrfGuard,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class AuthModule {}
