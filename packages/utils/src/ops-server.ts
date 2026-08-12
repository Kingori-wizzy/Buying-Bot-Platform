import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';

import type {
  ApiErrorBody,
  HealthReport,
  NodeEnvironment,
} from '@buying-bot/types';

import { aggregateHealth, processHealthCheck } from './health.js';
import { createCorrelationId, createRequestId } from './ids.js';
import type { Logger } from './logger.js';

export type ReadinessChecker = () =>
  Promise<HealthReport['checks']> | HealthReport['checks'];

export interface OpsServerOptions {
  readonly service: string;
  readonly environment: NodeEnvironment;
  readonly host: string;
  readonly port: number;
  readonly logger: Logger;
  readonly getReadiness?: ReadinessChecker;
  readonly exposeStackTraces?: boolean;
}

export interface OpsServer {
  readonly start: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly address: () => { host: string; port: number } | undefined;
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(payload);
}

function readHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value[0]) {
    return value[0];
  }
  return undefined;
}

/**
 * Minimal Node HTTP ops surface: liveness, readiness, and health.
 * Intentionally framework-agnostic until a service framework ADR is accepted.
 */
export function createOpsServer(options: OpsServerOptions): OpsServer {
  let server: Server | undefined;
  let ready = false;

  const getReadiness: ReadinessChecker =
    options.getReadiness ?? (() => [processHealthCheck()]);

  const requestListener = (req: IncomingMessage, res: ServerResponse): void => {
    const requestId = createRequestId();
    const correlationId = createCorrelationId(
      readHeader(req, 'x-correlation-id') ?? readHeader(req, 'x-request-id'),
    );
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);

    const method = req.method ?? 'GET';
    const url = new URL(
      req.url ?? '/',
      `http://${options.host}:${String(options.port)}`,
    );
    const path = url.pathname;
    const started = Date.now();
    const reqLogger = options.logger.child({
      requestId,
      correlationId,
      path,
      method,
    });

    const finish = (statusCode: number): void => {
      reqLogger.info('request completed', {
        statusCode,
        durationMs: Date.now() - started,
      });
    };

    void (async () => {
      try {
        if (method !== 'GET') {
          const body: ApiErrorBody = {
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Only GET is supported on ops endpoints',
              requestId,
            },
          };
          sendJson(res, 405, body);
          finish(405);
          return;
        }

        if (path === '/health/live' || path === '/livez') {
          sendJson(res, 200, {
            status: 'ok',
            service: options.service,
            requestId,
          });
          finish(200);
          return;
        }

        if (path === '/health/ready' || path === '/readyz') {
          if (!ready) {
            sendJson(res, 503, {
              status: 'error',
              service: options.service,
              message: 'service is starting',
              requestId,
            });
            finish(503);
            return;
          }

          const checks = await getReadiness();
          const report = aggregateHealth(
            options.service,
            options.environment,
            checks,
          );
          const statusCode = report.status === 'error' ? 503 : 200;
          sendJson(res, statusCode, { ...report, requestId });
          finish(statusCode);
          return;
        }

        if (path === '/health' || path === '/healthz') {
          const checks = ready
            ? await getReadiness()
            : [
                {
                  name: 'process',
                  status: 'degraded' as const,
                  message: 'service is starting',
                },
              ];
          const report = aggregateHealth(
            options.service,
            options.environment,
            checks,
          );
          sendJson(res, 200, { ...report, requestId });
          finish(200);
          return;
        }

        const body: ApiErrorBody = {
          error: {
            code: 'NOT_FOUND',
            message: 'Not found',
            requestId,
          },
        };
        sendJson(res, 404, body);
        finish(404);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unexpected error';
        reqLogger.error('ops request failed', { error: message });
        const body: ApiErrorBody = {
          error: {
            code: 'INTERNAL_ERROR',
            message:
              options.exposeStackTraces === true
                ? message
                : 'Internal server error',
            requestId,
            ...(options.exposeStackTraces === true && error instanceof Error
              ? { details: { stack: error.stack } }
              : {}),
          },
        };
        sendJson(res, 500, body);
        finish(500);
      }
    })();
  };

  return {
    start: async () => {
      if (server) {
        return;
      }
      server = createServer(requestListener);
      await new Promise<void>((resolve, reject) => {
        server?.once('error', reject);
        server?.listen(options.port, options.host, () => {
          ready = true;
          options.logger.info('ops server listening', {
            host: options.host,
            port: options.port,
          });
          resolve();
        });
      });
    },
    stop: async () => {
      ready = false;
      const active = server;
      server = undefined;
      if (!active) {
        return;
      }
      await new Promise<void>((resolve, reject) => {
        active.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      options.logger.info('ops server stopped');
    },
    address: () => {
      const addr = server?.address();
      if (!addr || typeof addr === 'string') {
        return undefined;
      }
      return { host: addr.address, port: addr.port };
    },
  };
}
