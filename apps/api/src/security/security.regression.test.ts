import {
  apiEnvSchema,
  assertSafeCorsOrigin,
  loadEnv,
} from '@buying-bot/config';
import type { Logger } from '@buying-bot/utils';
import type { ArgumentsHost, ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CsrfGuard } from '../auth/guards.js';
import { ApiExceptionFilter } from '../common/filters/http-exception.filter.js';

describe('security regressions', () => {
  it('blocks wildcard production CORS', () => {
    expect(() => {
      assertSafeCorsOrigin('*', 'production');
    }).toThrow();
  });

  it('guards product-sources admin controller with session + RBAC', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src/product-sources/product-sources.admin.controller.ts',
      ),
      'utf8',
    );
    expect(source).toContain('SessionAuthGuard');
    expect(source).toContain('PermissionsGuard');
    expect(source).toContain('RequireRealm');
    expect(source).not.toContain("'catalog:write'");
    expect(source).toContain("'catalog:update'");
  });

  it('requires a CSRF token on session mutations', () => {
    const env = loadEnv(
      apiEnvSchema,
      { NODE_ENV: 'test', CORS_ORIGIN: 'https://shop.example.test' },
      'SECURITY_TEST',
    );
    const request = {
      method: 'POST',
      headers: { origin: 'https://shop.example.test' },
      cookies: { [env.CUSTOMER_SESSION_COOKIE]: 'session' },
    };
    const context = {
      getHandler: () =>
        function handler(): undefined {
          return undefined;
        },
      getClass: () =>
        class TestController {
          readonly controllerName = 'TestController';
        },
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(() =>
      new CsrfGuard(env, new Reflector()).canActivate(context),
    ).toThrow(ForbiddenException);
  });

  it('does not expose stack traces in production error responses', () => {
    let sent: unknown;
    const reply = {
      getHeader: () => undefined,
      status: () => reply,
      send: (payload: unknown) => {
        sent = payload;
      },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => reply,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;
    const logger = {
      error: () => undefined,
    } as unknown as Logger;

    new ApiExceptionFilter(logger, false).catch(
      new Error('database password leaked'),
      host,
    );

    expect(sent).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: 'unknown',
      },
    });
  });
});
