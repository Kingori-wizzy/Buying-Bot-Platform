import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@buying-bot/database';

import { buildDedupeKey, slugifyTitle } from '../dedupe.js';
import { createDefaultProductSourceRegistry } from '../index.js';
import { fetchAllSourceProducts } from '../paginated-port.js';
import { assessQuarantine } from '../quarantine.js';
import { parseSourceRuntimeConfig } from '../source-config.js';
import type { NormalizedSourceProduct } from '../types.js';

const DEFAULT_ORG_SLUG = 'platform';
const DEFAULT_LOCATION_CODE = 'DEFAULT';

interface SourceRow {
  id: string;
  code: string;
  status: string;
  enabled?: boolean;
  defaultCurrency?: string;
}

type IngestPrisma = PrismaClient & {
  quarantinedSourceProduct: {
    create: (args: {
      data: {
        sourceId: string;
        sourceProductId: string;
        reason: string;
        detail?: string;
        rawSnapshotJson: object;
      };
    }) => Promise<unknown>;
  };
};

export async function runProductSourceSync(
  prisma: PrismaClient,
  input: { sourceCode: string; syncRunId: string },
): Promise<void> {
  const registry = createDefaultProductSourceRegistry();
  const adapter = registry.get(input.sourceCode);
  if (!adapter) {
    await failSyncRun(prisma, input.syncRunId, `No adapter for ${input.sourceCode}`);
    return;
  }

  const source = (await prisma.productSource.findUnique({
    where: { code: input.sourceCode },
  })) as SourceRow | null;
  if (!source) {
    await failSyncRun(prisma, input.syncRunId, 'Source row missing');
    return;
  }
  if (source.enabled === false || source.status === 'DISABLED') {
    await failSyncRun(prisma, input.syncRunId, 'Source disabled');
    return;
  }

  let fetched = 0;
  let accepted = 0;
  let rejected = 0;
  let updated = 0;
  let removed = 0;
  const syncStartedAt = Date.now();
  const seenSourceProductIds = new Set<string>();

  try {
    const health = await adapter.health();
    await prisma.productSource.update({
      where: { id: source.id },
      data: {
        healthStatus: health.ok ? 'HEALTHY' : 'UNHEALTHY',
        ...(health.ok
          ? {}
          : {
              status:
                source.status === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'DEGRADED',
            }),
      },
    });
    if (!health.ok && source.status === 'NOT_CONFIGURED') {
      await failSyncRun(prisma, input.syncRunId, health.message);
      return;
    }

    const runtime = parseSourceRuntimeConfig(
      (source as { configJson?: unknown }).configJson,
    );
    const pageSize = Math.min(
      runtime.pageSize,
      (source as { rateLimitPerMinute?: number }).rateLimitPerMinute ?? 100,
    );

    const items = await fetchAllSourceProducts(adapter, {
      pageSize,
      maxPages: 500,
    });
    fetched = items.length;

    for (const item of items) {
      seenSourceProductIds.add(item.sourceProductId);
      try {
        const validation = assessQuarantine(item, {
          allowedCurrencies: [source.defaultCurrency ?? 'KES', 'USD', 'EUR', 'GBP'],
        });
        if (!validation.ok) {
          await (prisma as IngestPrisma).quarantinedSourceProduct.create({
            data: {
              sourceId: source.id,
              sourceProductId: item.sourceProductId,
              reason: validation.reason,
              detail: validation.detail,
              rawSnapshotJson: item,
            },
          });
          rejected += 1;
          continue;
        }
        const wasUpdate = await upsertNormalizedProduct(prisma, source.id, item);
        if (wasUpdate) {
          updated += 1;
        } else {
          accepted += 1;
        }
      } catch {
        rejected += 1;
      }
    }

    const staleCutoff = new Date(syncStartedAt);
    const staleResult = await prisma.sourceProductRecord.updateMany({
      where: {
        sourceId: source.id,
        sourceProductId: { notIn: [...seenSourceProductIds] },
        lastSeenAt: { lt: staleCutoff },
      },
      data: { availabilityStatus: 'UNAVAILABLE' },
    });
    removed = staleResult.count;

    const durationMs = Date.now() - syncStartedAt;
    await prisma.sourceSyncRun.update({
      where: { id: input.syncRunId },
      data: {
        status: 'SUCCESS',
        productsFetched: fetched,
        productsAccepted: accepted,
        productsRejected: rejected,
        productsUpdated: updated,
        productsRemoved: removed,
        durationMs,
        checkpointJson: {
          pagesProcessed: Math.ceil(fetched / pageSize),
          seenCount: seenSourceProductIds.size,
        },
        completedAt: new Date(),
      },
    });
    await prisma.productSource.update({
      where: { id: source.id },
      data: {
        lastSyncAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
        healthStatus: 'HEALTHY',
        status: source.status === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'ACTIVE',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync failed';
    await failSyncRun(
      prisma,
      input.syncRunId,
      message,
      fetched,
      accepted,
      rejected,
    );
    await prisma.productSource.update({
      where: { id: source.id },
      data: {
        lastError: message,
        status: 'FAILED',
        lastSyncAt: new Date(),
        lastFailedAt: new Date(),
        healthStatus: 'UNHEALTHY',
      },
    });
  }
}

async function failSyncRun(
  prisma: PrismaClient,
  syncRunId: string,
  message: string,
  fetched = 0,
  accepted = 0,
  rejected = 0,
): Promise<void> {
  await prisma.sourceSyncRun.update({
    where: { id: syncRunId },
    data: {
      status: 'FAILED',
      errorMessage: message,
      productsFetched: fetched,
      productsAccepted: accepted,
      productsRejected: rejected,
      completedAt: new Date(),
    },
  });
}

async function resolveCanonicalProduct(
  prisma: PrismaClient,
  sourceId: string,
  item: NormalizedSourceProduct,
  dedupeKey: string,
): Promise<{
  productId: string | null;
  offerId: string | null;
  skuId: string | null;
  canonicalGroupId: string;
}> {
  const existingBySource = await prisma.sourceProductRecord.findUnique({
    where: {
      sourceId_sourceProductId: { sourceId, sourceProductId: item.sourceProductId },
    },
  });
  if (existingBySource?.productId) {
    return {
      productId: existingBySource.productId,
      offerId: existingBySource.offerId,
      skuId: existingBySource.skuId,
      canonicalGroupId:
        existingBySource.canonicalGroupId ?? existingBySource.id,
    };
  }

  const canonicalPeer = await prisma.sourceProductRecord.findFirst({
    where: {
      dedupeKey,
      productId: { not: null },
      NOT: { sourceId, sourceProductId: item.sourceProductId },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (canonicalPeer?.productId) {
    return {
      productId: canonicalPeer.productId,
      offerId: null,
      skuId: null,
      canonicalGroupId: canonicalPeer.canonicalGroupId ?? canonicalPeer.id,
    };
  }

  return {
    productId: null,
    offerId: null,
    skuId: null,
    canonicalGroupId: randomUUID(),
  };
}

async function upsertNormalizedProduct(
  prisma: PrismaClient,
  sourceId: string,
  item: NormalizedSourceProduct,
): Promise<boolean> {
  const now = new Date();
  const dedupeKey = buildDedupeKey(item);
  const priorRecord = await prisma.sourceProductRecord.findUnique({
    where: {
      sourceId_sourceProductId: { sourceId, sourceProductId: item.sourceProductId },
    },
  });
  const isUpdate = Boolean(priorRecord?.productId);
  const org = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
  });
  if (!org) throw new Error('ORG_MISSING');
  const location = await prisma.location.findFirst({
    where: { code: DEFAULT_LOCATION_CODE },
  });
  if (!location) throw new Error('LOCATION_MISSING');

  let brandId: string | null = null;
  if (item.brandName) {
    const brandSlug = slugifyTitle(item.brandName);
    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      create: { name: item.brandName, slug: brandSlug },
      update: { name: item.brandName },
    });
    brandId = brand.id;
  }

  let categoryId: string | null = null;
  if (item.categorySlug) {
    const category = await prisma.category.upsert({
      where: { slug: item.categorySlug },
      create: {
        name: item.categorySlug.replace(/-/g, ' '),
        slug: item.categorySlug,
        active: true,
      },
      update: {},
    });
    categoryId = category.id;
  }

  const resolved = await resolveCanonicalProduct(prisma, sourceId, item, dedupeKey);
  let { productId, offerId, skuId } = resolved;
  const { canonicalGroupId } = resolved;

  const productSlug = productId
    ? undefined
    : `src-${slugifyTitle(item.sourceProductId)}`;
  const internalSku = `SRC-${item.sourceProductId.slice(0, 40).toUpperCase()}`;

  if (!productId && productSlug) {
    const product = await prisma.product.upsert({
      where: { slug: productSlug },
      create: {
        name: item.title,
        slug: productSlug,
        shortDescription: item.shortDescription ?? null,
        description: item.description ?? null,
        status: 'ACTIVE',
        brandId,
        primaryCategoryId: categoryId,
      },
      update: {
        name: item.title,
        shortDescription: item.shortDescription ?? null,
        description: item.description ?? null,
        brandId,
        primaryCategoryId: categoryId,
        status: 'ACTIVE',
      },
    });
    productId = product.id;

    const variant =
      (await prisma.variant.findFirst({ where: { productId: product.id } })) ??
      (await prisma.variant.create({
        data: { productId: product.id, name: item.variantName },
      }));

    const sku =
      (await prisma.sku.findFirst({ where: { variantId: variant.id } })) ??
      (await prisma.sku.create({
        data: {
          variantId: variant.id,
          internalSku,
          sellerSku: item.sourceOfferId ?? null,
          barcode: item.gtin ?? null,
        },
      }));
    skuId = sku.id;

    const offer = await prisma.offer.create({
      data: {
        organizationId: org.id,
        skuId: sku.id,
        listPriceMinor: item.amountMinor,
        currency: item.currency,
        active: true,
      },
    });
    offerId = offer.id;

    await prisma.inventoryBalance.upsert({
      where: { skuId_locationId: { skuId: sku.id, locationId: location.id } },
      create: {
        skuId: sku.id,
        locationId: location.id,
        onHand: item.availability === 'UNAVAILABLE' ? 0 : 10,
        reserved: 0,
      },
      update: {},
    });

    if (item.imageUrl) {
      const media = await prisma.mediaAsset.create({
        data: {
          objectKey: `external:${item.sourceProductId}`,
          externalUrl: item.imageUrl,
          attribution: item.imageAttribution ?? null,
          mimeType: 'image/jpeg',
          status: 'READY',
        },
      });
      await prisma.productMedia.upsert({
        where: {
          productId_mediaAssetId: {
            productId: product.id,
            mediaAssetId: media.id,
          },
        },
        create: { productId: product.id, mediaAssetId: media.id, sortOrder: 0 },
        update: {},
      });
    }
  } else if (productId) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: item.title,
        shortDescription: item.shortDescription ?? null,
        description: item.description ?? null,
        brandId,
        primaryCategoryId: categoryId,
      },
    });

    if (!offerId) {
      const variant =
        (await prisma.variant.findFirst({ where: { productId } })) ??
        (await prisma.variant.create({
          data: { productId, name: item.variantName },
        }));
      const sku =
        (await prisma.sku.findFirst({ where: { variantId: variant.id } })) ??
        (await prisma.sku.create({
          data: {
            variantId: variant.id,
            internalSku,
            sellerSku: item.sourceOfferId ?? null,
            barcode: item.gtin ?? null,
          },
        }));
      skuId = sku.id;
      const offer = await prisma.offer.create({
        data: {
          organizationId: org.id,
          skuId: sku.id,
          listPriceMinor: item.amountMinor,
          currency: item.currency,
          active: item.availability !== 'UNAVAILABLE',
        },
      });
      offerId = offer.id;
    } else {
      await prisma.offer.update({
        where: { id: offerId },
        data: {
          listPriceMinor: item.amountMinor,
          currency: item.currency,
          active: item.availability !== 'UNAVAILABLE',
        },
      });
    }

    if (item.imageUrl && productId) {
      const existingMedia = await prisma.productMedia.findFirst({
        where: { productId },
        include: { mediaAsset: true },
      });
      if (
        !existingMedia?.mediaAsset.externalUrl ||
        existingMedia.mediaAsset.externalUrl !== item.imageUrl
      ) {
        const media = await prisma.mediaAsset.create({
          data: {
            objectKey: `external:${item.sourceProductId}`,
            externalUrl: item.imageUrl,
            attribution: item.imageAttribution ?? null,
            mimeType: 'image/jpeg',
            status: 'READY',
          },
        });
        await prisma.productMedia.upsert({
          where: {
            productId_mediaAssetId: {
              productId,
              mediaAssetId: media.id,
            },
          },
          create: { productId, mediaAssetId: media.id, sortOrder: 0 },
          update: {},
        });
      }
    }
  }

  if (productId) {
    const searchDoc = [
      item.title,
      item.brandName,
      item.shortDescription,
      item.description,
      internalSku,
      item.gtin,
      Object.entries(item.specifications ?? {})
        .map(([k, v]) => `${k} ${v}`)
        .join(' '),
    ]
      .filter(Boolean)
      .join(' ');

    await prisma.productSearchDocument.upsert({
      where: { productId },
      create: { productId, document: searchDoc },
      update: { document: searchDoc },
    });
  }

  const record = await prisma.sourceProductRecord.upsert({
    where: {
      sourceId_sourceProductId: { sourceId, sourceProductId: item.sourceProductId },
    },
    create: {
      sourceId,
      sourceProductId: item.sourceProductId,
      sourceOfferId: item.sourceOfferId ?? null,
      productId,
      offerId,
      skuId,
      sourceUrl: item.sourceUrl,
      sellerName: item.sellerName,
      title: item.title,
      brandName: item.brandName ?? null,
      gtin: item.gtin ?? null,
      dedupeKey,
      canonicalGroupId,
      imageUrl: item.imageUrl ?? null,
      imageAttribution: item.imageAttribution ?? null,
      priceMinor: item.amountMinor,
      currency: item.currency,
      availabilityStatus: item.availability,
      contentOrigin: item.contentOrigin,
      priceObservedAt: now,
      availabilityObservedAt: now,
      lastSeenAt: now,
      rawSnapshotJson: item,
    },
    update: {
      productId,
      offerId,
      skuId,
      sourceUrl: item.sourceUrl,
      sellerName: item.sellerName,
      title: item.title,
      brandName: item.brandName ?? null,
      gtin: item.gtin ?? null,
      dedupeKey,
      canonicalGroupId,
      priceMinor: item.amountMinor,
      currency: item.currency,
      availabilityStatus: item.availability,
      priceObservedAt: now,
      availabilityObservedAt: now,
      lastSeenAt: now,
      rawSnapshotJson: item,
    },
  });

  if (canonicalGroupId) {
    await prisma.sourceProductRecord.updateMany({
      where: { dedupeKey, canonicalGroupId: null },
      data: { canonicalGroupId },
    });
  }

  await prisma.priceObservation.create({
    data: {
      sourceId,
      sourceProductRecordId: record.id,
      offerId,
      amountMinor: item.amountMinor,
      currency: item.currency,
      observedAt: now,
    },
  });
  return isUpdate;
}
