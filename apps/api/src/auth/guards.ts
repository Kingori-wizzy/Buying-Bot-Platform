import type { Authorizer, AuthPrincipal } from '@buying-bot/auth';
import { DefaultAuthorizer, parsePermissionKey } from '@buying-bot/auth';
import type { Permission } from '@buying-bot/types';
import {
  type CanActivate,
  createParamDecorator,
  type CustomDecorator,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import type { ApiEnv } from '../config/env.js';
import { APP_ENV } from '../config/tokens.js';
import { AuthService } from './auth.service.js';
import type { AuthedRequest } from './auth.types.js';

export type { AuthedRequest } from './auth.types.js';

export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = (): CustomDecorator => SetMetadata(SKIP_CSRF_KEY, true);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';
export const RequirePermissions = (
  ...permissions: readonly string[]
): CustomDecorator => SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);

export const REQUIRE_ANY_PERMISSIONS_KEY = 'requireAnyPermissions';
export const RequireAnyPermissions = (
  ...permissions: readonly string[]
): CustomDecorator => SetMetadata(REQUIRE_ANY_PERMISSIONS_KEY, permissions);

export const REQUIRE_REALM_KEY = 'requireRealm';
export const RequireRealm = (realm: 'customer' | 'admin'): CustomDecorator =>
  SetMetadata(REQUIRE_REALM_KEY, realm);

export const REQUIRE_MFA_KEY = 'requireMfa';
export const RequireMfa = (): CustomDecorator =>
  SetMetadata(REQUIRE_MFA_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!request.authPrincipal) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }
    return request.authPrincipal;
  },
);

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const principal =
      await this.authService.resolvePrincipalFromRequest(request);
    if (!principal) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }
    request.authPrincipal = principal;
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly authorizer: Authorizer = new DefaultAuthorizer();

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAll = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAny = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!requiredAll || requiredAll.length === 0) &&
      (!requiredAny || requiredAny.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const principal = request.authPrincipal;
    if (!principal) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    const parseAll = (keys: readonly string[]): Permission[] => {
      const permissions: Permission[] = [];
      for (const key of keys) {
        const parsed = parsePermissionKey(key);
        if (!parsed) {
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Invalid permission metadata',
          });
        }
        permissions.push(parsed);
      }
      return permissions;
    };

    if (requiredAll && requiredAll.length > 0) {
      const permissions = parseAll(requiredAll);
      const allowed = permissions.every((permission) =>
        this.authorizer.isAllowed(principal, permission),
      );
      if (!allowed) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }
    }

    if (requiredAny && requiredAny.length > 0) {
      const permissions = parseAll(requiredAny);
      const allowed = permissions.some((permission) =>
        this.authorizer.isAllowed(principal, permission),
      );
      if (!allowed) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }
    }

    return true;
  }
}

@Injectable()
export class RealmGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<
      'customer' | 'admin' | undefined
    >(REQUIRE_REALM_KEY, [context.getHandler(), context.getClass()]);
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (request.authPrincipal?.realm !== required) {
      throw new ForbiddenException({
        code: 'WRONG_REALM',
        message: `Requires ${required} realm`,
      });
    }
    return true;
  }
}

@Injectable()
export class MfaSatisfiedGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_MFA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required !== true) {
      return true;
    }
    if (!this.env.ADMIN_MFA_REQUIRED) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (
      request.authPrincipal?.realm === 'admin' &&
      !request.authPrincipal.mfaSatisfied
    ) {
      throw new ForbiddenException({
        code: 'MFA_REQUIRED',
        message: 'Admin MFA challenge required',
      });
    }
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const origin = request.headers.origin;
    const allowlist = this.env.CORS_ORIGIN.split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (typeof origin === 'string' && origin.length > 0) {
      if (!allowlist.includes(origin)) {
        throw new ForbiddenException({
          code: 'CSRF_ORIGIN',
          message: 'Origin not allowed',
        });
      }
    } else if (!isPublic) {
      const hasSessionCookie =
        Boolean(request.cookies[this.env.CUSTOMER_SESSION_COOKIE]) ||
        Boolean(request.cookies[this.env.ADMIN_SESSION_COOKIE]);
      if (hasSessionCookie) {
        throw new ForbiddenException({
          code: 'CSRF_ORIGIN',
          message: 'Origin required for cookie sessions',
        });
      }
    }

    const csrfCookie = request.cookies[this.env.CSRF_COOKIE];
    const csrfHeader = request.headers['x-csrf-token'];
    const headerValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

    if (!csrfCookie || !headerValue || csrfCookie !== headerValue) {
      throw new ForbiddenException({
        code: 'CSRF_TOKEN',
        message: 'Invalid CSRF token',
      });
    }

    return true;
  }
}
