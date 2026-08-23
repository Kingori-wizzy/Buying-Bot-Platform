import { loadEnv, resolveLogLevel, workerEnvSchema } from '@buying-bot/config';
import {
  createPrismaClient,
  expireHeldReservations,
  type PrismaClient,
  processNotificationIntents,
  publishPendingOutbox,
  requeueFailedOutbox,
} from '@buying-bot/database';
import { runProductSourceSync } from '@buying-bot/product-sources';
import type { OpsServer } from '@buying-bot/utils';
import {
  createLogger,
  createOpsServer,
  installGracefulShutdown,
  processHealthCheck,
} from '@buying-bot/utils';

import { runCatalogImportJob } from './catalog-import.js';
import { processKnowledgeIngest } from './knowledge-ingest.js';
import { InMemoryMetrics } from './metrics.js';
import {
  initiatePaymentFromOutbox,
  type PaymentInitiatePayload,
} from './payment-initiate.js';

export interface WorkerRuntime {
  readonly stop: () => Promise<void>;
  readonly address: OpsServer['address'];
}

export type PaymentInitiateHandler = (payload: {
  orderId: string;
  paymentId: string;
  attemptId: string;
  msisdnE164: string;
  amountMinor: number;
  currency: string;
}) => Promise<void>;

/**
 * Process outbox payment.initiate messages (provider HTTP after DB commit).
 */
export async function processOutboxOnce(
  prisma: PrismaClient,
  onPaymentInitiate?: PaymentInitiateHandler,
  onKnowledgeIngest?: (payload: {
    documentId: string;
    content: string;
  }) => Promise<void>,
  onProductSourceSync?: (payload: {
    sourceCode: string;
    syncRunId: string;
  }) => Promise<void>,
  onCatalogImport?: (payload: {
    importId: string;
    rows: unknown[];
    parseErrors?: unknown[];
  }) => Promise<void>,
): Promise<number> {
  return publishPendingOutbox(prisma, async (type, payload) => {
    if (type === 'payment.initiate' && onPaymentInitiate) {
      await onPaymentInitiate(
        payload as {
          orderId: string;
          paymentId: string;
          attemptId: string;
          msisdnE164: string;
          amountMinor: number;
          currency: string;
        },
      );
      return;
    }
    if (type === 'knowledge.ingest' && onKnowledgeIngest) {
      await onKnowledgeIngest(
        payload as { documentId: string; content: string },
      );
      return;
    }
    if (type === 'product-source.sync' && onProductSourceSync) {
      await onProductSourceSync(
        payload as { sourceCode: string; syncRunId: string },
      );
      return;
    }
    if (type === 'catalog.import' && onCatalogImport) {
      await onCatalogImport(
        payload as {
          importId: string;
          rows: unknown[];
          parseErrors?: unknown[];
        },
      );
    }
  });
}

export async function expireReservationsOnce(
  prisma: PrismaClient,
): Promise<number> {
  return expireHeldReservations(prisma);
}

/**
 * Background worker: outbox, reservations, notifications, knowledge ingest.
 */
export async function bootstrap(
  envSource: NodeJS.ProcessEnv = process.env,
): Promise<WorkerRuntime> {
  const env = loadEnv(workerEnvSchema, envSource, 'WORKER');
  const logger = createLogger({
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    level: resolveLogLevel(env),
  });
  const metrics = new InMemoryMetrics();

  let prisma: PrismaClient | undefined;
  const timers: NodeJS.Timeout[] = [];

  if (env.DATABASE_URL) {
    const database = createPrismaClient(env.DATABASE_URL);
    prisma = database;
    const knowledgeHandler = async (payload: {
      documentId: string;
      content: string;
    }): Promise<void> => {
      await processKnowledgeIngest({
        prisma: database,
        documentId: payload.documentId,
        content: payload.content,
        aiServiceBaseUrl: env.AI_SERVICE_BASE_URL,
        serviceJwtSecret: env.SERVICE_JWT_SECRET,
        aiProvider: env.AI_PROVIDER,
      });
      metrics.inc('worker_knowledge_ingest_total');
    };

    const paymentHandler = async (
      payload: PaymentInitiatePayload,
    ): Promise<void> => {
      await initiatePaymentFromOutbox(database, payload, {
        provider: env.PAYMENT_PROVIDER,
        escrow: {
          apiKey: env.ESCROW_API_KEY,
          apiSecret: env.ESCROW_API_SECRET,
          baseUrl: env.ESCROW_BASE_URL,
          webhookSecret: env.ESCROW_WEBHOOK_SECRET,
          allowTestDouble: env.ESCROW_ALLOW_TEST_DOUBLE,
        },
        mpesa: {
          enabled: env.MPESA_ENABLED,
          consumerKey: env.MPESA_CONSUMER_KEY,
          consumerSecret: env.MPESA_CONSUMER_SECRET,
          shortcode: env.MPESA_SHORTCODE,
          passkey: env.MPESA_PASSKEY,
          callbackUrl: env.MPESA_CALLBACK_URL,
          env: env.MPESA_ENV,
        },
      });
      metrics.inc('worker_payment_initiate_total');
    };

    const productSourceHandler = async (payload: {
      sourceCode: string;
      syncRunId: string;
    }): Promise<void> => {
      await runProductSourceSync(database, payload);
      metrics.inc('worker_product_source_sync_total');
    };

    const catalogImportHandler = async (payload: {
      importId: string;
      rows: unknown[];
      parseErrors?: unknown[];
    }): Promise<void> => {
      await runCatalogImportJob(database, {
        importId: payload.importId,
        rows: payload.rows as Parameters<typeof runCatalogImportJob>[1]['rows'],
        parseErrors: (payload.parseErrors ?? []) as {
          rowNumber: number;
          error: string;
        }[],
      });
      metrics.inc('worker_catalog_import_total');
    };

    timers.push(
      setInterval(() => {
        if (!prisma) {
          return;
        }
        void processOutboxOnce(
          prisma,
          paymentHandler,
          knowledgeHandler,
          productSourceHandler,
          catalogImportHandler,
        ).catch(
          (error: unknown) => {
            logger.warn('Outbox tick failed', {
              error: error instanceof Error ? error.message : 'unknown',
            });
          },
        );
      }, env.OUTBOX_POLL_INTERVAL_MS),
    );
    timers.push(
      setInterval(() => {
        if (!prisma) {
          return;
        }
        void expireReservationsOnce(prisma).catch((error: unknown) => {
          logger.warn('Reservation expiry tick failed', {
            error: error instanceof Error ? error.message : 'unknown',
          });
        });
      }, env.RESERVATION_EXPIRE_INTERVAL_MS),
    );
    timers.push(
      setInterval(() => {
        if (!prisma) {
          return;
        }
        void processNotificationIntents(prisma, (message) => {
          logger.info('notification email (console)', {
            recipient: message.recipient.replace(/(.{2}).+(@.+)/, '$1***$2'),
            subject: message.subject,
          });
          return Promise.resolve({
            provider: 'console-email',
            reference: `console-${String(Date.now())}`,
          });
        })
          .then((n) => {
            if (n > 0) {
              metrics.inc('worker_notifications_sent_total', {}, n);
            }
          })
          .catch((error: unknown) => {
            logger.warn('Notification tick failed', {
              error: error instanceof Error ? error.message : 'unknown',
            });
          });
      }, env.NOTIFICATION_POLL_INTERVAL_MS),
    );
    timers.push(
      setInterval(
        () => {
          if (!prisma) {
            return;
          }
          void requeueFailedOutbox(prisma, 50).catch((error: unknown) => {
            logger.warn('Outbox requeue tick failed', {
              error: error instanceof Error ? error.message : 'unknown',
            });
          });
        },
        Math.max(env.OUTBOX_POLL_INTERVAL_MS * 6, 30_000),
      ),
    );
  }

  const ops = createOpsServer({
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    logger,
    exposeStackTraces: env.NODE_ENV !== 'production',
    getReadiness: () => [processHealthCheck()],
    getMetricsText: () => metrics.toPrometheus(),
  });

  installGracefulShutdown({
    logger,
    onShutdown: async () => {
      for (const timer of timers) {
        clearInterval(timer);
      }
      if (prisma) {
        await prisma.$disconnect();
      }
      await ops.stop();
    },
  });

  await ops.start();
  logger.info('Worker bootstrap complete', {
    databaseConfigured: Boolean(env.DATABASE_URL),
  });

  return {
    stop: async () => {
      for (const timer of timers) {
        clearInterval(timer);
      }
      if (prisma) {
        await prisma.$disconnect();
      }
      await ops.stop();
    },
    address: () => ops.address(),
  };
}
