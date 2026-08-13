import type { ApiErrorBody } from '@buying-bot/types';
import type { Logger } from '@buying-bot/utils';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly exposeStackTraces: boolean,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const requestIdHeader = request.headers['x-request-id'];
    const requestIdFromHeader =
      typeof requestIdHeader === 'string' ? requestIdHeader : undefined;
    const requestId =
      requestIdFromHeader ??
      response.getHeader('x-request-id')?.toString() ??
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = statusName(status);
      } else if (typeof body === 'object') {
        const record = body as Record<string, unknown>;
        if (typeof record.message === 'string') {
          message = record.message;
        } else if (Array.isArray(record.message)) {
          message = record.message.join('; ');
          details = record.message;
        }
        if (typeof record.code === 'string') {
          code = record.code;
        } else {
          code = statusName(status);
        }
        if (record.details !== undefined) {
          details = record.details;
        }
      }
    } else if (exception instanceof Error) {
      message = this.exposeStackTraces
        ? exception.message
        : 'Internal server error';
      if (this.exposeStackTraces) {
        details = { stack: exception.stack };
      }
      this.logger.error('Unhandled exception', {
        requestId,
        error: exception.message,
      });
    }

    const payload: ApiErrorBody = {
      error: {
        code,
        message,
        requestId,
        ...(details !== undefined ? { details } : {}),
      },
    };

    void response.status(status).send(payload);
  }
}

function statusName(status: number): string {
  const name = HttpStatus[status];
  return typeof name === 'string' ? name : 'HTTP_ERROR';
}
