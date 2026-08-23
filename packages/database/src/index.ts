/**
 * Database ports and Prisma PostgreSQL adapter for identity persistence.
 * Cache (Redis) is never the system of record for critical business data.
 *
 * Service-to-service auth uses signed JWTs (no ServiceIdentity table in M5).
 */

export { hashOpaqueToken, normalizeEmail, sha256Hex } from './crypto-utils.js';
export {
  confirmPaymentForOrder,
  expireHeldReservations,
  type OutboxHandler,
  publishPendingOutbox,
} from './jobs/commerce-jobs.js';
export {
  type EmailSender,
  type NotificationEmail,
  processNotificationIntents,
} from './jobs/notifications.js';
export { requeueFailedOutbox } from './jobs/outbox-recovery.js';
export type {
  DatabaseClient,
  DatabaseHealth,
  Repository,
  UnitOfWork,
} from './ports.js';
export {
  createPrismaClient,
  disconnectPrisma,
  type PrismaClient,
  PrismaDatabaseClient,
} from './prisma-client.js';
export {
  DEFAULT_LOCATION_CODE,
  DEFAULT_ORG_SLUG,
  PERMISSION_CATALOG,
  ROLE_CATALOG,
  seedCommerceDefaults,
  seedIdentityCatalog,
} from './seed.js';
export {
  DEMO_CATALOG_NOTICE,
  seedDemoCatalog,
} from './seed-demo-catalog.js';
export { seedStagingCatalog, STAGING_PRODUCT_SLUG } from './seed-staging.js';
