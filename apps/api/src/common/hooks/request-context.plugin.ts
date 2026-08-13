import { createCorrelationId, createRequestId } from '@buying-bot/utils';
import type {
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    correlationId: string;
  }
}

export const requestContextPlugin: FastifyPluginCallback = (
  app,
  _opts,
  done,
) => {
  app.addHook(
    'onRequest',
    (request: FastifyRequest, reply: FastifyReply, next) => {
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

      request.requestId = requestId;
      request.correlationId = correlationId;
      void reply.header('x-request-id', requestId);
      void reply.header('x-correlation-id', correlationId);
      next();
    },
  );
  done();
};
