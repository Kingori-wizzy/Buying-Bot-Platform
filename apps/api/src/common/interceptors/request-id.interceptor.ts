import { createCorrelationId, createRequestId } from '@buying-bot/utils';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    const incomingRequestId =
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : undefined;
    const incomingCorrelationId =
      typeof request.headers['x-correlation-id'] === 'string'
        ? request.headers['x-correlation-id']
        : incomingRequestId;

    const requestId = incomingRequestId?.trim() ?? createRequestId();
    const correlationId = createCorrelationId(incomingCorrelationId);

    (request as FastifyRequest & { requestId: string }).requestId = requestId;
    (request as FastifyRequest & { correlationId: string }).correlationId =
      correlationId;
    void reply.header('x-request-id', requestId);
    void reply.header('x-correlation-id', correlationId);

    return next.handle();
  }
}
