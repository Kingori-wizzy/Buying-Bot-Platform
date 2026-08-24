import { randomUUID } from 'node:crypto';

import type { PrismaClient, PrismaDatabaseClient } from '@buying-bot/database';
import {
  computePriceFreshness,
  runProductSourceSync,
} from '@buying-bot/product-sources';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE_CLIENT } from '../config/tokens.js';
import type { PatchProductSourceBody } from './product-sources.schemas.js';

const DEFAULT_SOURCES = [
  {
    code: 'mock-marketplace',
    name: 'Mock Marketplace (Sandbox) — DEFERRED',
    sourceType: 'MOCK' as const,
    attributionRequired: true,
    enabled: false,
    status: 'DISABLED' as const,
    countryCode: 'KE',
    defaultCurrency: 'KES',
    syncIntervalMinutes: 60,
    priority: 100,
  },
  {
    code: 'csv-fixture-feed',
    name: 'CSV Fixture Feed (Sandbox) — DEFERRED',
    sourceType: 'CSV_FEED' as const,
    attributionRequired: false,
    enabled: false,
    status: 'DISABLED' as const,
    countryCode: 'KE',
    defaultCurrency: 'KES',
    syncIntervalMinutes: 120,
    priority: 90,
  },
  {
    code: 'jumia-seller-api',
    name: 'Jumia Seller Center API — FUTURE MARKETPLACE',
    sourceType: 'MARKETPLACE_API' as const,
    attributionRequired: true,
    enabled: false,
    status: 'NOT_CONFIGURED' as const,
    baseUrl: 'https://vendor-api.jumia.com',
    apiVersion: 'GPM-0.2',
    authType: 'API_KEY',
    countryCode: 'KE',
    defaultCurrency: 'KES',
    termsUrl: 'https://sellercenter.jumia.com/',
    syncIntervalMinutes: 360,
    priority: 10,
  },
];

@Injectable()
export class ProductSourcesService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
  ) {}

  private prisma(): PrismaClient {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  private async auditAdminAction(
    type: string,
    metadata: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    await this.prisma().securityEvent.create({
      data: {
        type,
        metadata,
        correlationId: randomUUID(),
      },
    });
  }

  async ensureDefaultSources(): Promise<void> {
    const prisma = this.prisma();
    for (const source of DEFAULT_SOURCES) {
      await prisma.productSource.upsert({
        where: { code: source.code },
        create: {
          code: source.code,
          name: source.name,
          sourceType: source.sourceType,
          status: source.status,
          enabled: source.enabled,
          attributionRequired: source.attributionRequired,
          countryCode: source.countryCode,
          defaultCurrency: source.defaultCurrency,
          syncIntervalMinutes: source.syncIntervalMinutes,
          priority: source.priority,
          ...(source.baseUrl ? { baseUrl: source.baseUrl } : {}),
          ...(source.apiVersion ? { apiVersion: source.apiVersion } : {}),
          ...(source.authType ? { authType: source.authType } : {}),
          ...(source.termsUrl ? { termsUrl: source.termsUrl } : {}),
        },
        update: {
          name: source.name,
          sourceType: source.sourceType,
          enabled: source.enabled,
          status: source.status,
          countryCode: source.countryCode,
          defaultCurrency: source.defaultCurrency,
          syncIntervalMinutes: source.syncIntervalMinutes,
          priority: source.priority,
          ...(source.baseUrl ? { baseUrl: source.baseUrl } : {}),
          ...(source.apiVersion ? { apiVersion: source.apiVersion } : {}),
          ...(source.authType ? { authType: source.authType } : {}),
          ...(source.termsUrl ? { termsUrl: source.termsUrl } : {}),
        },
      });
    }
  }

  async listSources(): Promise<unknown> {
    await this.ensureDefaultSources();
    const prisma = this.prisma();
    const sources = await prisma.productSource.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { productRecords: true, syncRuns: true } },
      },
    });
    return sources.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      sourceType: s.sourceType,
      status: s.status,
      enabled: s.enabled,
      baseUrl: s.baseUrl,
      apiVersion: s.apiVersion,
      authType: s.authType,
      syncIntervalMinutes: s.syncIntervalMinutes,
      priority: s.priority,
      countryCode: s.countryCode,
      defaultCurrency: s.defaultCurrency,
      termsUrl: s.termsUrl,
      healthStatus: s.healthStatus,
      lastSyncAt: s.lastSyncAt,
      lastSuccessAt: s.lastSuccessAt,
      lastFailedAt: s.lastFailedAt,
      lastError: s.lastError,
      productRecordCount: s._count.productRecords,
      syncRunCount: s._count.syncRuns,
    }));
  }

  async getSourceStats(sourceCode: string): Promise<unknown> {
    await this.ensureDefaultSources();
    const source = await this.prisma().productSource.findUnique({
      where: { code: sourceCode },
    });
    if (!source) {
      throw new NotFoundException({
        code: 'SOURCE_NOT_FOUND',
        message: 'Product source not found',
      });
    }
    const prisma = this.prisma();
    const [
      recordCount,
      withImages,
      withPrices,
      quarantined,
      sandboxCount,
      realCount,
      lastRun,
      freshnessBuckets,
    ] = await Promise.all([
      prisma.sourceProductRecord.count({ where: { sourceId: source.id } }),
      prisma.sourceProductRecord.count({
        where: { sourceId: source.id, imageUrl: { not: null } },
      }),
      prisma.sourceProductRecord.count({
        where: { sourceId: source.id, priceMinor: { not: null } },
      }),
      prisma.quarantinedSourceProduct.count({ where: { sourceId: source.id } }),
      prisma.sourceProductRecord.count({
        where: {
          sourceId: source.id,
          contentOrigin: { in: ['SANDBOX', 'DEMO', 'TEST'] },
        },
      }),
      prisma.sourceProductRecord.count({
        where: { sourceId: source.id, contentOrigin: 'REAL_SOURCE' },
      }),
      prisma.sourceSyncRun.findFirst({
        where: { sourceId: source.id },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.sourceProductRecord.findMany({
        where: { sourceId: source.id },
        select: { priceObservedAt: true },
      }),
    ]);

    const freshness = { FRESH: 0, RECENT: 0, STALE: 0, EXPIRED: 0 };
    for (const row of freshnessBuckets) {
      const band = computePriceFreshness(row.priceObservedAt);
      freshness[band] += 1;
    }

    const failedRuns = await prisma.sourceSyncRun.count({
      where: { sourceId: source.id, status: 'FAILED' },
    });
    const successRuns = await prisma.sourceSyncRun.count({
      where: { sourceId: source.id, status: 'SUCCESS' },
    });

    return {
      sourceCode,
      status: source.status,
      enabled: source.enabled,
      healthStatus: source.healthStatus,
      productRecords: recordCount,
      withImages,
      withPrices,
      quarantined,
      contentOrigin: { sandbox: sandboxCount, realSource: realCount },
      priceFreshness: freshness,
      syncRuns: {
        success: successRuns,
        failed: failedRuns,
        last: lastRun,
      },
    };
  }

  async listQuarantined(sourceCode: string, limit = 50): Promise<unknown> {
    await this.ensureDefaultSources();
    const source = await this.prisma().productSource.findUnique({
      where: { code: sourceCode },
    });
    if (!source) {
      throw new NotFoundException({
        code: 'SOURCE_NOT_FOUND',
        message: 'Product source not found',
      });
    }
    return this.prisma().quarantinedSourceProduct.findMany({
      where: { sourceId: source.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        sourceProductId: true,
        reason: true,
        detail: true,
        createdAt: true,
      },
    });
  }

  async patchSource(
    sourceCode: string,
    body: PatchProductSourceBody,
    actingSubjectId?: string,
  ): Promise<unknown> {
    await this.ensureDefaultSources();
    const source = await this.prisma().productSource.findUnique({
      where: { code: sourceCode },
    });
    if (!source) {
      throw new NotFoundException({
        code: 'SOURCE_NOT_FOUND',
        message: 'Product source not found',
      });
    }
    if (
      sourceCode === 'jumia-seller-api' &&
      body.enabled === true &&
      source.status === 'NOT_CONFIGURED'
    ) {
      throw new BadRequestException({
        code: 'SOURCE_NOT_CONFIGURED',
        message:
          'Cannot enable Jumia source without credentials — set JUMIA_SELLER_* env vars first',
      });
    }
    const updated = await this.prisma().productSource.update({
      where: { code: sourceCode },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.syncIntervalMinutes !== undefined
          ? { syncIntervalMinutes: body.syncIntervalMinutes }
          : {}),
      },
    });
    await this.auditAdminAction('admin.product_source.patch', {
      sourceCode,
      actingSubjectId: actingSubjectId ?? null,
      enabled: body.enabled ?? null,
      status: body.status ?? null,
      syncIntervalMinutes: body.syncIntervalMinutes ?? null,
    });
    return {
      code: updated.code,
      enabled: updated.enabled,
      status: updated.status,
      syncIntervalMinutes: updated.syncIntervalMinutes,
    };
  }

  async listSyncRuns(sourceCode: string, limit = 20): Promise<unknown> {
    await this.ensureDefaultSources();
    const source = await this.prisma().productSource.findUnique({
      where: { code: sourceCode },
    });
    if (!source) {
      throw new NotFoundException({
        code: 'SOURCE_NOT_FOUND',
        message: 'Product source not found',
      });
    }
    return this.prisma().sourceSyncRun.findMany({
      where: { sourceId: source.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async triggerSync(
    sourceCode: string,
    actingSubjectId?: string,
  ): Promise<{ syncRunId: string }> {
    if (process.env.MARKETPLACE_INGESTION_ENABLED !== 'true') {
      throw new BadRequestException({
        code: 'MARKETPLACE_INGESTION_DISABLED',
        message:
          'Marketplace product-source sync is deferred. The shop catalog is admin-managed. Set MARKETPLACE_INGESTION_ENABLED=true only for explicit future marketplace work.',
      });
    }
    await this.ensureDefaultSources();
    const prisma = this.prisma();
    const source = await prisma.productSource.findUnique({
      where: { code: sourceCode },
    });
    if (!source) {
      throw new NotFoundException({
        code: 'SOURCE_NOT_FOUND',
        message: 'Product source not found',
      });
    }
    if (!source.enabled || source.status === 'DISABLED') {
      throw new BadRequestException({
        code: 'SOURCE_DISABLED',
        message: 'Product source is disabled',
      });
    }
    if (source.status === 'NOT_CONFIGURED') {
      throw new BadRequestException({
        code: 'SOURCE_NOT_CONFIGURED',
        message: 'Product source requires external credentials before sync',
      });
    }
    if (source.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'SOURCE_DISABLED',
        message: 'Product source is not active',
      });
    }

    const syncRunId = randomUUID();
    const correlationId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.sourceSyncRun.create({
        data: {
          id: syncRunId,
          sourceId: source.id,
          status: 'RUNNING',
          correlationId,
        },
      });
      await tx.outboxMessage.create({
        data: {
          type: 'product-source.sync',
          payloadJson: { sourceCode, syncRunId, correlationId },
        },
      });
    });
    await this.auditAdminAction('admin.product_source.sync_trigger', {
      sourceCode,
      syncRunId,
      actingSubjectId: actingSubjectId ?? null,
    });
    return { syncRunId };
  }

  async processSync(sourceCode: string, syncRunId: string): Promise<void> {
    await runProductSourceSync(this.prisma(), { sourceCode, syncRunId });
  }

  async getProvenanceForProduct(productId: string): Promise<unknown> {
    const record = await this.prisma().sourceProductRecord.findFirst({
      where: { productId },
      include: { source: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    if (!record) {
      return null;
    }
    return {
      sourceCode: record.source.code,
      sourceName: record.source.name,
      sourceUrl: record.sourceUrl,
      sellerName: record.sellerName,
      priceMinor: record.priceMinor,
      currency: record.currency,
      availabilityStatus: record.availabilityStatus,
      contentOrigin: record.contentOrigin,
      priceObservedAt: record.priceObservedAt,
      imageUrl: record.imageUrl,
      imageAttribution: record.imageAttribution,
    };
  }
}
