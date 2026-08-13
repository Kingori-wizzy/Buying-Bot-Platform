import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { ApiEnv } from '../config/env.js';
import { APP_ENV } from '../config/tokens.js';
import { type ServiceJwtClaims, verifyServiceJwt } from './service-jwt.js';

export type ServiceJwtRequest = FastifyRequest & {
  serviceJwtClaims?: ServiceJwtClaims;
};

@Injectable()
export class ServiceJwtGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly env: ApiEnv) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ServiceJwtRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw this.unauthorized();
    }

    const token = authorization.slice('Bearer '.length).trim();
    for (const audience of ['ai-service', 'api'] as const) {
      try {
        request.serviceJwtClaims = await verifyServiceJwt({
          token,
          secret: this.env.SERVICE_JWT_SECRET,
          audience,
        });
        return true;
      } catch {
        // Try the other explicitly allowed internal audience.
      }
    }
    throw this.unauthorized();
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_SERVICE_JWT',
      message: 'A valid internal service token is required',
    });
  }
}
