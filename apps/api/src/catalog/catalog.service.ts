import { randomBytes } from 'node:crypto';

import {
  DEFAULT_ORG_SLUG,
  type PrismaClient,
  type PrismaDatabaseClient,
} from '@buying-bot/database';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import type { ApiEnv } from '../config/env.js';
import { APP_ENV, DATABASE_CLIENT, PRODUCT_CACHE } from '../config/tokens.js';
import { validateUpload } from '../security/upload-validation.js';
import type {
  CreateBrandBody,
  CreateCategoryBody,
  CreateMediaBody,
  CreateOfferBody,
  CreateProductBody,
  ProductListQuery,
  UpdateOfferBody,
  UpdateProductBody,
  UploadMediaBody,
} from './catalog.schemas.js';
import { parseCatalogCsv } from './catalog-csv.js';
import { pickPrimaryImage } from './catalog-provenance.js';
import { type ProductCache, productCacheKey } from './product-cache.js';
import { looksLikeUuid, slugify, slugWithSuffix } from './slug.js';

/** Public catalog only exposes active, non-deleted offers (matches getProduct). */
const ACTIVE_OFFER_WHERE = { active: true, deletedAt: null } as const;

function availableUnits(product: {
  variants: {
    sku?: {
      offers?: { listPriceMinor: number; inventoryMode?: string }[];
      inventoryBalances?: { onHand: number; reserved: number }[];
    } | null;
  }[];
}): number {
  const unlimited = product.variants.some((variant) =>
    (variant.sku?.offers ?? []).some(
      (offer) => offer.inventoryMode === 'UNLIMITED',
    ),
  );
  if (unlimited) {
    return Number.MAX_SAFE_INTEGER;
  }
  return product.variants.reduce((sum, variant) => {
    const balances = variant.sku?.inventoryBalances ?? [];
    return (
      sum +
      balances.reduce(
        (acc, row) => acc + Math.max(0, row.onHand - row.reserved),
        0,
      )
    );
  }, 0);
}

function lowestOfferMinor(product: {
  variants: {
    sku?: { offers?: { listPriceMinor: number }[] } | null;
  }[];
}): number | null {
  const prices = product.variants.flatMap((v) => v.sku?.offers ?? []);
  if (prices.length === 0) {
    return null;
  }
  return Math.min(...prices.map((o) => o.listPriceMinor));
}

type CatalogPrisma = PrismaClient & {
  catalogImport: {
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    findUnique: (args: Record<string, unknown>) => Promise<unknown>;
  };
  catalogImportRow: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

function asCatalogPrisma(prisma: PrismaClient): CatalogPrisma {
  return prisma as CatalogPrisma;
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Optional() @Inject(APP_ENV) private readonly env?: ApiEnv,
    @Optional() @Inject(PRODUCT_CACHE) private readonly cache?: ProductCache,
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

  async listProducts(query: ProductListQuery): Promise<{
    items: unknown[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const prisma = this.prisma();
    let categoryId = query.categoryId;
    if (!categoryId && query.categorySlug) {
      const cat = await prisma.category.findFirst({
        where: { slug: query.categorySlug, deletedAt: null, active: true },
      });
      categoryId = cat?.id;
      if (!categoryId) {
        return {
          items: [],
          page: query.page,
          pageSize: query.pageSize,
          total: 0,
        };
      }
    }
    const childIds =
      categoryId !== undefined
        ? (
            await prisma.category.findMany({
              where: { parentId: categoryId, deletedAt: null },
              select: { id: true },
            })
          ).map((c) => c.id)
        : [];
    const categoryFilter =
      categoryId !== undefined
        ? {
            primaryCategoryId: {
              in: [categoryId, ...childIds],
            },
          }
        : {};

    const where = {
      deletedAt: null,
      status: 'ACTIVE' as const,
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...categoryFilter,
      ...(query.productKind ? { productKind: query.productKind } : {}),
      ...(query.digitalType ? { digitalType: query.digitalType } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { slug: { contains: query.q, mode: 'insensitive' as const } },
              {
                shortDescription: {
                  contains: query.q,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: query.q,
                  mode: 'insensitive' as const,
                },
              },
              {
                brand: {
                  name: { contains: query.q, mode: 'insensitive' as const },
                },
              },
              {
                primaryCategory: {
                  name: { contains: query.q, mode: 'insensitive' as const },
                },
              },
              {
                variants: {
                  some: {
                    sku: {
                      internalSku: {
                        contains: query.q,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.priceMinMinor !== undefined || query.priceMaxMinor !== undefined
        ? {
            variants: {
              some: {
                sku: {
                  offers: {
                    some: {
                      ...ACTIVE_OFFER_WHERE,
                      ...(query.priceMinMinor !== undefined
                        ? { listPriceMinor: { gte: query.priceMinMinor } }
                        : {}),
                      ...(query.priceMaxMinor !== undefined
                        ? { listPriceMinor: { lte: query.priceMaxMinor } }
                        : {}),
                    },
                  },
                },
              },
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy:
          query.sort === 'price_asc' || query.sort === 'price_desc'
            ? { createdAt: 'desc' as const }
            : { createdAt: 'desc' as const },
        include: {
          brand: true,
          primaryCategory: true,
          media: { include: { mediaAsset: true } },
          variants: {
            include: {
              sku: {
                include: {
                  offers: { where: ACTIVE_OFFER_WHERE },
                  inventoryBalances: true,
                },
              },
            },
          },
        },
      }),
    ]);
    let filtered = items;
    if (query.inStock === true) {
      filtered = filtered.filter((product) => availableUnits(product) > 0);
    }
    if (query.sort === 'price_asc' || query.sort === 'price_desc') {
      const dir = query.sort === 'price_asc' ? 1 : -1;
      filtered = [...filtered].sort((a, b) => {
        const pa = lowestOfferMinor(a) ?? Number.POSITIVE_INFINITY;
        const pb = lowestOfferMinor(b) ?? Number.POSITIVE_INFINITY;
        return (pa - pb) * dir;
      });
    }
    return {
      items: await this.enrichPublicProducts(filtered),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getProduct(idOrSlug: string): Promise<unknown> {
    const cacheKey = productCacheKey(idOrSlug);
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as unknown;
      }
    }

    const prisma = this.prisma();
    const product = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(looksLikeUuid(idOrSlug)
          ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }
          : { slug: idOrSlug }),
      },
      include: {
        brand: true,
        primaryCategory: true,
        media: { include: { mediaAsset: true } },
        variants: {
          include: {
            sku: {
              include: { offers: { where: ACTIVE_OFFER_WHERE } },
            },
            media: { include: { mediaAsset: true } },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }
    const enriched = await this.enrichPublicProduct(product);
    if (this.cache) {
      const ttl = this.env?.PRODUCT_CACHE_TTL_SECONDS ?? 60;
      await this.cache.set(cacheKey, JSON.stringify(enriched), ttl);
      if (product.slug !== idOrSlug) {
        await this.cache.set(
          productCacheKey(product.slug),
          JSON.stringify(enriched),
          ttl,
        );
      }
      await this.cache.set(
        productCacheKey(product.id),
        JSON.stringify(enriched),
        ttl,
      );
    }
    return enriched;
  }

  async invalidateProductCache(id: string, slug?: string): Promise<void> {
    if (!this.cache) {
      return;
    }
    await this.cache.del(productCacheKey(id));
    if (slug) {
      await this.cache.del(productCacheKey(slug));
    }
  }

  async getRelatedProducts(idOrSlug: string, limit = 8): Promise<unknown[]> {
    const product = (await this.getProduct(idOrSlug)) as {
      id: string;
      brandId?: string | null;
      primaryCategoryId?: string | null;
    };
    return this.prisma().product.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        id: { not: product.id },
        OR: [
          ...(product.brandId ? [{ brandId: product.brandId }] : []),
          ...(product.primaryCategoryId
            ? [{ primaryCategoryId: product.primaryCategoryId }]
            : []),
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: { brand: true, primaryCategory: true },
    });
  }

  async listCategories(): Promise<unknown[]> {
    return this.prisma().category.findMany({
      where: { deletedAt: null, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { deletedAt: null, active: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            primaryProducts: {
              where: { deletedAt: null, status: 'ACTIVE' },
            },
          },
        },
      },
    });
  }

  async getCategoryBySlug(slug: string): Promise<unknown> {
    const category = await this.prisma().category.findFirst({
      where: { slug, deletedAt: null, active: true },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null, active: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: {
              select: {
                primaryProducts: {
                  where: { deletedAt: null, status: 'ACTIVE' },
                },
              },
            },
          },
        },
        _count: {
          select: {
            primaryProducts: {
              where: { deletedAt: null, status: 'ACTIVE' },
            },
          },
        },
      },
    });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }
    return category;
  }

  async updateCategory(
    id: string,
    body: import('./catalog.schemas.js').UpdateCategoryBody,
  ): Promise<unknown> {
    const prisma = this.prisma();
    const existing = await prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }
    let slug = existing.slug;
    if (body.slug !== undefined || body.name !== undefined) {
      slug = await this.ensureUniqueSlug(
        'category',
        body.slug ?? body.name ?? existing.name,
        id,
      );
    }
    return prisma.category.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        slug,
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.archived === true
          ? { active: false, deletedAt: new Date() }
          : {}),
      },
    });
  }

  async listBrands(): Promise<unknown[]> {
    return this.prisma().brand.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async searchProducts(query: ProductListQuery): Promise<{
    items: unknown[];
    page: number;
    pageSize: number;
  }> {
    const prisma = this.prisma();
    const q = query.q?.trim();
    if (!q) {
      return this.listProducts(query);
    }

    const rows = await prisma.$queryRaw<
      { product_id: string }[]
    >`SELECT psd.product_id
      FROM catalog.product_search_documents psd
      INNER JOIN catalog.products p ON p.id = psd.product_id
      WHERE p.deleted_at IS NULL
        AND p.status = 'ACTIVE'
        AND (
          psd.document_tsv @@ plainto_tsquery('simple', ${q})
          OR psd.document ILIKE '%' || ${q} || '%'
        )
      ORDER BY ts_rank(psd.document_tsv, plainto_tsquery('simple', ${q})) DESC
      LIMIT ${query.pageSize}
      OFFSET ${(query.page - 1) * query.pageSize}`;

    const ids = rows.map((row) => row.product_id);
    if (ids.length === 0) {
      return { items: [], page: query.page, pageSize: query.pageSize };
    }
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        brand: true,
        media: { include: { mediaAsset: true } },
        variants: {
          include: {
            sku: {
              include: {
                offers: { where: ACTIVE_OFFER_WHERE },
                inventoryBalances: true,
              },
            },
          },
        },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    let ordered = ids
      .map((id) => byId.get(id))
      .filter(Boolean) as typeof products;

    if (
      query.priceMinMinor !== undefined ||
      query.priceMaxMinor !== undefined
    ) {
      ordered = ordered.filter((product) => {
        const prices = product.variants.flatMap((v) => v.sku?.offers ?? []);
        return prices.some((offer) => {
          if (
            query.priceMinMinor !== undefined &&
            offer.listPriceMinor < query.priceMinMinor
          ) {
            return false;
          }
          if (
            query.priceMaxMinor !== undefined &&
            offer.listPriceMinor > query.priceMaxMinor
          ) {
            return false;
          }
          return true;
        });
      });
    }

    if (query.brandId) {
      ordered = ordered.filter((product) => product.brandId === query.brandId);
    }
    if (query.categoryId) {
      ordered = ordered.filter(
        (product) => product.primaryCategoryId === query.categoryId,
      );
    }
    if (query.inStock === true) {
      ordered = ordered.filter((product) => availableUnits(product) > 0);
    }
    if (query.sort === 'price_asc' || query.sort === 'price_desc') {
      const dir = query.sort === 'price_asc' ? 1 : -1;
      ordered = [...ordered].sort((a, b) => {
        const pa = lowestOfferMinor(a) ?? Number.POSITIVE_INFINITY;
        const pb = lowestOfferMinor(b) ?? Number.POSITIVE_INFINITY;
        return (pa - pb) * dir;
      });
    }

    return {
      items: await this.enrichPublicProducts(ordered),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async createBrand(body: CreateBrandBody): Promise<unknown> {
    const prisma = this.prisma();
    const slug = await this.ensureUniqueSlug(
      'brand',
      body.slug ?? slugify(body.name),
    );
    return prisma.brand.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
      },
    });
  }

  async createCategory(body: CreateCategoryBody): Promise<unknown> {
    const prisma = this.prisma();
    const slug = await this.ensureUniqueSlug(
      'category',
      body.slug ?? slugify(body.name),
    );
    return prisma.category.create({
      data: {
        name: body.name,
        slug,
        parentId: body.parentId ?? null,
        description: body.description ?? null,
        sortOrder: body.sortOrder ?? 0,
        active: body.active ?? true,
      },
    });
  }

  async createProduct(body: CreateProductBody): Promise<unknown> {
    const prisma = this.prisma();
    if (body.status === 'ACTIVE') {
      if (body.listPriceMinor === undefined) {
        throw new BadRequestException({
          code: 'PUBLISH_VALIDATION_FAILED',
          message: 'ACTIVE products require listPriceMinor at create time',
        });
      }
    }
    const slug = await this.ensureUniqueSlug(
      'product',
      body.slug ?? slugify(body.name),
    );
    const internalSku =
      body.internalSku ?? `SKU-${randomBytes(4).toString('hex').toUpperCase()}`;
    const currency = body.currency ?? this.env?.DEFAULT_CURRENCY ?? 'KES';
    const org = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORG_SLUG },
    });
    if (!org) {
      throw new BadRequestException({
        code: 'ORG_MISSING',
        message: 'Default organization missing',
      });
    }
    const location = await prisma.location.findFirst({
      where: { code: 'DEFAULT' },
    });

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: body.name,
          slug,
          shortDescription: body.shortDescription ?? null,
          description: body.description ?? null,
          status: body.status ?? 'DRAFT',
          contentOrigin: body.contentOrigin ?? 'ADMIN',
          productKind: body.productKind ?? 'DIGITAL',
          digitalType:
            body.digitalType === undefined
              ? body.productKind === 'PHYSICAL'
                ? null
                : 'OTHER'
              : body.digitalType,
          ...(body.features ? { featuresJson: body.features } : {}),
          requirementsText: body.requirementsText ?? null,
          instructionsText: body.instructionsText ?? null,
          brandId: body.brandId ?? null,
          primaryCategoryId: body.primaryCategoryId ?? null,
          seoTitle: body.seoTitle ?? null,
          seoDescription: body.seoDescription ?? null,
        },
      });
      const variant = await tx.variant.create({
        data: {
          productId: created.id,
          name: body.variantName ?? 'Default',
        },
      });
      const sku = await tx.sku.create({
        data: {
          variantId: variant.id,
          internalSku,
        },
      });
      if (body.listPriceMinor !== undefined) {
        await tx.offer.create({
          data: {
            organizationId: org.id,
            skuId: sku.id,
            listPriceMinor: body.listPriceMinor,
            currency,
            active: true,
            inventoryMode: body.inventoryMode ?? 'FINITE',
            deliveryMethod: body.deliveryMethod ?? 'MANUAL',
            validityDays: body.validityDays ?? null,
          },
        });
      }
      const inventoryMode = body.inventoryMode ?? 'FINITE';
      if (
        location &&
        body.initialStock !== undefined &&
        inventoryMode === 'FINITE'
      ) {
        await tx.inventoryBalance.create({
          data: {
            skuId: sku.id,
            locationId: location.id,
            onHand: body.initialStock,
            reserved: 0,
          },
        });
      }
      await tx.productSearchDocument.upsert({
        where: { productId: created.id },
        create: {
          productId: created.id,
          document: [
            created.name,
            created.shortDescription,
            created.description,
            created.digitalType,
            internalSku,
            body.features?.join(' '),
          ]
            .filter(Boolean)
            .join(' '),
        },
        update: {
          document: [
            created.name,
            created.shortDescription,
            created.description,
            created.digitalType,
            internalSku,
            body.features?.join(' '),
          ]
            .filter(Boolean)
            .join(' '),
        },
      });
      return created;
    });

    return this.adminGetProduct(product.id);
  }

  async updateProduct(id: string, body: UpdateProductBody): Promise<unknown> {
    const prisma = this.prisma();
    const existing = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }
    if (body.status === 'ACTIVE') {
      await this.assertProductPublishable(id);
    }
    let slug = existing.slug;
    if (body.slug && body.slug !== existing.slug) {
      slug = await this.ensureUniqueSlug('product', body.slug, id);
    } else if (body.name && body.name !== existing.name && !body.slug) {
      slug = await this.ensureUniqueSlug('product', slugify(body.name), id);
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          slug,
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.shortDescription !== undefined
            ? { shortDescription: body.shortDescription }
            : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.contentOrigin !== undefined
            ? { contentOrigin: body.contentOrigin }
            : {}),
          ...(body.productKind !== undefined
            ? { productKind: body.productKind }
            : {}),
          ...(body.digitalType !== undefined
            ? { digitalType: body.digitalType }
            : {}),
          ...(body.features !== undefined
            ? { featuresJson: body.features }
            : {}),
          ...(body.requirementsText !== undefined
            ? { requirementsText: body.requirementsText }
            : {}),
          ...(body.instructionsText !== undefined
            ? { instructionsText: body.instructionsText }
            : {}),
          ...(body.brandId !== undefined ? { brandId: body.brandId } : {}),
          ...(body.primaryCategoryId !== undefined
            ? { primaryCategoryId: body.primaryCategoryId }
            : {}),
          ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle } : {}),
          ...(body.seoDescription !== undefined
            ? { seoDescription: body.seoDescription }
            : {}),
        },
      });
      const categoryId = updated.primaryCategoryId;
      const category = categoryId
        ? await tx.category.findFirst({
            where: { id: categoryId, deletedAt: null },
          })
        : null;
      const brandId = updated.brandId;
      const brand = brandId
        ? await tx.brand.findFirst({
            where: { id: brandId, deletedAt: null },
          })
        : null;
      const sku = await tx.sku.findFirst({
        where: {
          variant: { productId: id, deletedAt: null },
          deletedAt: null,
        },
      });
      await tx.productSearchDocument.upsert({
        where: { productId: id },
        create: {
          productId: id,
          document: [
            updated.name,
            updated.shortDescription,
            updated.description,
            updated.digitalType,
            category?.name,
            category?.slug,
            brand?.name,
            sku?.internalSku,
            Array.isArray(updated.featuresJson)
              ? (updated.featuresJson as string[]).join(' ')
              : null,
          ]
            .filter(Boolean)
            .join(' '),
        },
        update: {
          document: [
            updated.name,
            updated.shortDescription,
            updated.description,
            updated.digitalType,
            category?.name,
            category?.slug,
            brand?.name,
            sku?.internalSku,
            Array.isArray(updated.featuresJson)
              ? (updated.featuresJson as string[]).join(' ')
              : null,
          ]
            .filter(Boolean)
            .join(' '),
        },
      });
    });
    await this.invalidateProductCache(id, existing.slug);
    if (slug !== existing.slug) {
      await this.invalidateProductCache(id, slug);
    }
    return this.adminGetProduct(id);
  }

  async publishProduct(id: string): Promise<unknown> {
    await this.assertProductPublishable(id);
    return this.updateProduct(id, { status: 'ACTIVE' });
  }

  async unpublishProduct(id: string): Promise<unknown> {
    return this.updateProduct(id, { status: 'INACTIVE' });
  }

  async archiveProduct(id: string): Promise<unknown> {
    return this.updateProduct(id, { status: 'ARCHIVED' });
  }

  private async assertProductPublishable(productId: string): Promise<void> {
    const product = await this.prisma().product.findFirst({
      where: { id: productId, deletedAt: null },
      include: {
        variants: {
          include: {
            sku: { include: { offers: { where: ACTIVE_OFFER_WHERE } } },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }
    const errors: string[] = [];
    if (!product.name.trim()) {
      errors.push('name is required');
    }
    const sku = product.variants[0]?.sku;
    if (!sku) {
      errors.push('SKU is required');
    }
    const offer = sku?.offers[0];
    if (!offer) {
      errors.push('an active offer with price is required');
    } else if (offer.listPriceMinor < 0) {
      errors.push('offer price is invalid');
    }
    if (errors.length > 0) {
      throw new BadRequestException({
        code: 'PUBLISH_VALIDATION_FAILED',
        message: `Cannot publish product: ${errors.join('; ')}`,
        details: errors,
      });
    }
  }

  async adminGetProduct(id: string): Promise<unknown> {
    const product = await this.prisma().product.findFirst({
      where: { id, deletedAt: null },
      include: {
        brand: true,
        primaryCategory: true,
        variants: { include: { sku: { include: { offers: true } } } },
        media: { include: { mediaAsset: true } },
      },
    });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }
    return product;
  }

  async adminListProducts(query: {
    page: number;
    pageSize: number;
    status?: string;
    q?: string;
    categoryId?: string;
    digitalType?: string;
  }): Promise<{
    items: unknown[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const prisma = this.prisma();
    const allowed = [
      'DRAFT',
      'PENDING_REVIEW',
      'ACTIVE',
      'INACTIVE',
      'ARCHIVED',
    ] as const;
    const statusFilter = allowed.find((value) => value === query.status);
    const digitalTypes = [
      'DIGITAL_ACCOUNT',
      'DIGITAL_SUBSCRIPTION',
      'DIGITAL_SERVICE',
      'DIGITAL_ACCESS',
      'DIGITAL_LICENSE',
      'DIGITAL_CREDENTIAL',
      'DIGITAL_REWARD',
      'OTHER',
    ] as const;
    const digitalTypeFilter = digitalTypes.find(
      (value) => value === query.digitalType,
    );
    const where = {
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.categoryId ? { primaryCategoryId: query.categoryId } : {}),
      ...(digitalTypeFilter ? { digitalType: digitalTypeFilter } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { slug: { contains: query.q, mode: 'insensitive' as const } },
              {
                shortDescription: {
                  contains: query.q,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          brand: true,
          primaryCategory: true,
          variants: { include: { sku: { include: { offers: true } } } },
        },
      }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async createOffer(body: CreateOfferBody): Promise<unknown> {
    const prisma = this.prisma();
    const orgId =
      body.organizationId ??
      (
        await prisma.organization.findUnique({
          where: { slug: DEFAULT_ORG_SLUG },
        })
      )?.id;
    if (!orgId) {
      throw new BadRequestException({
        code: 'ORG_MISSING',
        message: 'Default organization missing',
      });
    }
    const currency = body.currency ?? this.env?.DEFAULT_CURRENCY ?? 'KES';
    return prisma.offer.create({
      data: {
        organizationId: orgId,
        skuId: body.skuId,
        listPriceMinor: body.listPriceMinor,
        currency,
        taxInclusive: body.taxInclusive ?? true,
        taxClass: body.taxClass ?? null,
        active: body.active ?? true,
        inventoryMode: body.inventoryMode ?? 'FINITE',
        deliveryMethod: body.deliveryMethod ?? 'MANUAL',
        validityDays: body.validityDays ?? null,
      },
    });
  }

  async createMedia(body: CreateMediaBody): Promise<unknown> {
    validateUpload(
      { mimeType: body.mimeType, size: 1 },
      {
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ],
        maxBytes: 10 * 1024 * 1024,
      },
    );
    const prisma = this.prisma();
    return prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          objectKey: body.objectKey,
          mimeType: body.mimeType,
          status: body.status ?? 'READY',
          externalUrl: body.externalUrl ?? null,
          attribution: body.attribution ?? null,
        },
      });
      if (body.productId) {
        await tx.productMedia.create({
          data: {
            productId: body.productId,
            mediaAssetId: asset.id,
            sortOrder: body.sortOrder ?? 0,
          },
        });
      }
      if (body.variantId) {
        await tx.variantMedia.create({
          data: {
            variantId: body.variantId,
            mediaAssetId: asset.id,
            sortOrder: body.sortOrder ?? 0,
          },
        });
      }
      return asset;
    });
  }

  /**
   * Store binary image bytes via local filesystem adapter (dev) or future cloud port.
   * Sets externalUrl to the public media URL so storefront can display it.
   */
  async uploadMediaBinary(body: UploadMediaBody): Promise<unknown> {
    const bytes = Buffer.from(body.dataBase64, 'base64');
    if (bytes.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_UPLOAD',
        message: 'Upload payload is empty',
      });
    }
    const maxBytes = this.env?.MEDIA_MAX_BYTES ?? 5 * 1024 * 1024;
    validateUpload(
      { mimeType: body.mimeType, size: bytes.length },
      {
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ],
        maxBytes,
      },
    );

    const { createObjectStorage } =
      await import('../media/create-object-storage.js');
    const storage = createObjectStorage(this.env);
    const stored = await storage.put({
      bytes,
      mimeType: body.mimeType,
      ...(body.fileName ? { originalName: body.fileName } : {}),
    });

    return this.createMedia({
      objectKey: stored.objectKey,
      mimeType: body.mimeType,
      status: 'READY',
      ...(stored.publicUrl ? { externalUrl: stored.publicUrl } : {}),
      ...(body.productId ? { productId: body.productId } : {}),
      ...(body.variantId ? { variantId: body.variantId } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.attribution
        ? { attribution: body.attribution }
        : body.altText
          ? { attribution: body.altText }
          : { attribution: 'Administrator-uploaded product image' }),
    });
  }

  async deleteMedia(id: string): Promise<{ ok: true }> {
    const prisma = this.prisma();
    const asset = await prisma.mediaAsset.findFirst({ where: { id } });
    if (!asset || asset.status === 'DELETED') {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Media asset not found',
      });
    }
    await prisma.$transaction(async (tx) => {
      await tx.productMedia.deleteMany({ where: { mediaAssetId: id } });
      await tx.variantMedia.deleteMany({ where: { mediaAssetId: id } });
      await tx.mediaAsset.update({
        where: { id },
        data: { status: 'DELETED' },
      });
    });
    try {
      const { createObjectStorage } =
        await import('../media/create-object-storage.js');
      await createObjectStorage(this.env).delete(asset.objectKey);
    } catch {
      // Object already gone or driver unavailable — metadata is deleted.
    }
    return { ok: true };
  }

  getMediaStorageRoot(): string {
    return (
      this.env?.MEDIA_LOCAL_ROOT ??
      `${process.cwd()}${process.cwd().includes('\\') ? '\\' : '/'}.data/media`
    );
  }

  async updateOffer(id: string, body: UpdateOfferBody): Promise<unknown> {
    const prisma = this.prisma();
    const existing = await prisma.offer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Offer not found',
      });
    }
    return prisma.offer.update({
      where: { id },
      data: {
        ...(body.listPriceMinor !== undefined
          ? { listPriceMinor: body.listPriceMinor }
          : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.taxInclusive !== undefined
          ? { taxInclusive: body.taxInclusive }
          : {}),
        ...(body.taxClass !== undefined ? { taxClass: body.taxClass } : {}),
        ...(body.inventoryMode !== undefined
          ? { inventoryMode: body.inventoryMode }
          : {}),
        ...(body.deliveryMethod !== undefined
          ? { deliveryMethod: body.deliveryMethod }
          : {}),
        ...(body.validityDays !== undefined
          ? { validityDays: body.validityDays }
          : {}),
      },
    });
  }

  private async ensureUniqueSlug(
    kind: 'brand' | 'category' | 'product',
    candidate: string,
    excludeId?: string,
  ): Promise<string> {
    const prisma = this.prisma();
    let slug = slugify(candidate);
    for (let i = 0; i < 8; i += 1) {
      const exists =
        kind === 'brand'
          ? await prisma.brand.findFirst({
              where: {
                slug,
                deletedAt: null,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
              },
            })
          : kind === 'category'
            ? await prisma.category.findFirst({
                where: {
                  slug,
                  deletedAt: null,
                  ...(excludeId ? { NOT: { id: excludeId } } : {}),
                },
              })
            : await prisma.product.findFirst({
                where: {
                  slug,
                  deletedAt: null,
                  ...(excludeId ? { NOT: { id: excludeId } } : {}),
                },
              });
      if (!exists) {
        return slug;
      }
      slug = slugWithSuffix(candidate, randomBytes(2).toString('hex'));
    }
    throw new BadRequestException({
      code: 'SLUG_COLLISION',
      message: 'Unable to allocate unique slug',
    });
  }

  async compareProducts(productIds: readonly string[]): Promise<unknown> {
    const prisma = this.prisma();
    const products = await prisma.product.findMany({
      where: {
        id: { in: [...productIds] },
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        brand: true,
        primaryCategory: { include: { parent: true } },
        media: { include: { mediaAsset: true } },
        variants: {
          include: {
            sku: {
              include: {
                offers: { where: ACTIVE_OFFER_WHERE },
                inventoryBalances: true,
              },
            },
          },
        },
      },
    });
    return productIds.map((id) => {
      const product = products.find((p) => p.id === id);
      if (!product) {
        return { productId: id, found: false };
      }
      const sku = product.variants[0]?.sku;
      const offer = sku?.offers[0];
      const media = product.media[0]?.mediaAsset;
      const category = product.primaryCategory;
      const isSubcategory = Boolean(category?.parentId && category.parent);
      const mainCategory = isSubcategory ? category?.parent : category;
      const subcategory = isSubcategory ? category : null;
      const available = availableUnits(product);
      const features = Array.isArray(product.featuresJson)
        ? product.featuresJson
        : [];
      return {
        productId: id,
        found: true,
        name: product.name,
        brand: product.brand?.name ?? null,
        category: mainCategory?.name ?? null,
        subcategory: subcategory?.name ?? null,
        digitalType: product.digitalType,
        features,
        offerId: offer?.id ?? null,
        listPriceMinor: offer?.listPriceMinor ?? null,
        currency: offer?.currency ?? null,
        validityDays: offer?.validityDays ?? null,
        deliveryMethod: offer?.deliveryMethod ?? null,
        inventoryMode: offer?.inventoryMode ?? null,
        imageUrl: media?.externalUrl ?? null,
        imageAttribution: media?.attribution ?? null,
        availableUnits: available,
        contentOrigin:
          (product as { contentOrigin?: string }).contentOrigin ?? 'ADMIN',
        provenance: null,
      };
    });
  }

  async getPriceHistory(productId: string, _limit = 20): Promise<unknown> {
    const prisma = this.prisma();
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: {
        variants: {
          include: {
            sku: { include: { offers: { where: ACTIVE_OFFER_WHERE } } },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }
    const offer = product.variants[0]?.sku?.offers[0];
    return {
      productId,
      offerId: offer?.id ?? null,
      currency: offer?.currency ?? null,
      currentPriceMinor: offer?.listPriceMinor ?? null,
      lowestObservedMinor: offer?.listPriceMinor ?? null,
      highestObservedMinor: offer?.listPriceMinor ?? null,
      observations: offer
        ? [
            {
              amountMinor: offer.listPriceMinor,
              currency: offer.currency,
              observedAt: offer.updatedAt.toISOString(),
              source: 'admin_offer',
            },
          ]
        : [],
      authoritative: true,
      note: 'Price history is based on the current administrator-managed offer. External marketplace price observations are deferred.',
    };
  }

  async getAvailability(productId: string): Promise<unknown> {
    const prisma = this.prisma();
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: {
        variants: {
          include: {
            sku: {
              include: {
                offers: { where: ACTIVE_OFFER_WHERE },
                inventoryBalances: true,
              },
            },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }
    const sku = product.variants[0]?.sku;
    const offer = sku?.offers[0];
    const available = (sku?.inventoryBalances ?? []).reduce(
      (sum, row) => sum + row.onHand - row.reserved,
      0,
    );
    return {
      productId,
      offerId: offer?.id ?? null,
      skuId: sku?.id ?? null,
      availableUnits: available,
      availabilityStatus: available > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      balances: (sku?.inventoryBalances ?? []).map((row) => ({
        locationId: row.locationId,
        onHand: row.onHand,
        reserved: row.reserved,
        available: row.onHand - row.reserved,
      })),
      contentOrigin:
        (product as { contentOrigin?: string }).contentOrigin ?? 'ADMIN',
      authoritative: true,
    };
  }

  async submitCatalogImport(input: {
    filename: string;
    csvText: string;
    dryRun: boolean;
    actingSubject?: string;
  }): Promise<unknown> {
    const prisma = asCatalogPrisma(this.prisma());
    const parsed = parseCatalogCsv(input.csvText);
    const importRow = await prisma.catalogImport.create({
      data: {
        filename: input.filename,
        status: input.dryRun ? 'DRY_RUN' : 'PENDING',
        dryRun: input.dryRun,
        actingSubject: input.actingSubject ?? null,
        rowsTotal: parsed.rows.length + parsed.errors.length,
        rowsRejected: parsed.errors.length,
        errorReportJson: parsed.errors,
      },
    });

    if (input.dryRun) {
      await prisma.catalogImport.update({
        where: { id: importRow.id },
        data: {
          status: 'DRY_RUN',
          completedAt: new Date(),
          rowsCreated: 0,
          rowsUpdated: 0,
          errorReportJson: [
            ...parsed.errors,
            ...parsed.rows.map((r) => ({
              rowNumber: r.rowNumber,
              preview: r.name,
              ok: true,
            })),
          ],
        },
      });
      return this.getCatalogImport(importRow.id);
    }

    await this.prisma().outboxMessage.create({
      data: {
        type: 'catalog.import',
        payloadJson: {
          importId: importRow.id,
          rows: parsed.rows.map((row) => ({ ...row })),
          parseErrors: parsed.errors.map((err) => ({ ...err })),
        },
      },
    });
    return this.getCatalogImport(importRow.id);
  }

  async processCatalogImport(
    importId: string,
    rows: {
      rowNumber: number;
      name: string;
      slug?: string;
      shortDescription?: string;
      description?: string;
      brand?: string;
      category?: string;
      internalSku?: string;
      listPriceMinor?: number;
      currency?: string;
      initialStock?: number;
      status?: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
    }[],
    parseErrors: { rowNumber: number; error: string }[] = [],
  ): Promise<void> {
    const prisma = this.prisma();
    const catalog = asCatalogPrisma(prisma);
    await catalog.catalogImport.update({
      where: { id: importId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    let created = 0;
    let updated = 0;
    let rejected = parseErrors.length;
    const errors = [...parseErrors];

    for (const row of rows) {
      try {
        let brandId: string | null = null;
        if (row.brand) {
          const brandSlug = slugify(row.brand);
          const brand = await prisma.brand.upsert({
            where: { slug: brandSlug },
            create: { name: row.brand, slug: brandSlug },
            update: { name: row.brand },
          });
          brandId = brand.id;
        }
        let categoryId: string | null = null;
        if (row.category) {
          const categorySlug = slugify(row.category);
          const category = await prisma.category.upsert({
            where: { slug: categorySlug },
            create: {
              name: row.category,
              slug: categorySlug,
              active: true,
            },
            update: { name: row.category },
          });
          categoryId = category.id;
        }
        const existingSku = row.internalSku
          ? await prisma.sku.findFirst({
              where: { internalSku: row.internalSku, deletedAt: null },
              include: { variant: true },
            })
          : null;

        if (existingSku?.variant.productId) {
          await this.updateProduct(existingSku.variant.productId, {
            name: row.name,
            ...(row.shortDescription
              ? { shortDescription: row.shortDescription }
              : {}),
            ...(row.description ? { description: row.description } : {}),
            ...(brandId ? { brandId } : {}),
            ...(categoryId ? { primaryCategoryId: categoryId } : {}),
            status: row.status === 'ACTIVE' ? 'DRAFT' : (row.status ?? 'DRAFT'),
            contentOrigin: 'IMPORT',
          });
          if (row.listPriceMinor !== undefined) {
            const offer = await prisma.offer.findFirst({
              where: { skuId: existingSku.id, deletedAt: null },
            });
            if (offer) {
              await this.updateOffer(offer.id, {
                listPriceMinor: row.listPriceMinor,
                ...(row.currency ? { currency: row.currency } : {}),
              });
            } else {
              await this.createOffer({
                skuId: existingSku.id,
                listPriceMinor: row.listPriceMinor,
                ...(row.currency ? { currency: row.currency } : {}),
              });
            }
          }
          updated += 1;
          await catalog.catalogImportRow.create({
            data: {
              importId,
              rowNumber: row.rowNumber,
              payloadJson: row,
              ok: true,
              productId: existingSku.variant.productId,
            },
          });
        } else {
          const createdProduct = (await this.createProduct({
            name: row.name,
            ...(row.slug ? { slug: row.slug } : {}),
            ...(row.shortDescription
              ? { shortDescription: row.shortDescription }
              : {}),
            ...(row.description ? { description: row.description } : {}),
            ...(row.internalSku ? { internalSku: row.internalSku } : {}),
            ...(row.listPriceMinor !== undefined
              ? { listPriceMinor: row.listPriceMinor }
              : {}),
            ...(row.currency ? { currency: row.currency } : {}),
            ...(row.initialStock !== undefined
              ? { initialStock: row.initialStock }
              : {}),
            ...(brandId ? { brandId } : {}),
            ...(categoryId ? { primaryCategoryId: categoryId } : {}),
            status: 'DRAFT',
            contentOrigin: 'IMPORT',
          })) as { id: string };
          created += 1;
          await catalog.catalogImportRow.create({
            data: {
              importId,
              rowNumber: row.rowNumber,
              payloadJson: row,
              ok: true,
              productId: createdProduct.id,
            },
          });
        }
      } catch (error) {
        rejected += 1;
        const message =
          error instanceof Error ? error.message : 'import row failed';
        errors.push({ rowNumber: row.rowNumber, error: message });
        await catalog.catalogImportRow.create({
          data: {
            importId,
            rowNumber: row.rowNumber,
            payloadJson: row,
            ok: false,
            error: message,
          },
        });
      }
    }

    await catalog.catalogImport.update({
      where: { id: importId },
      data: {
        status:
          rejected > 0 && created + updated > 0
            ? 'PARTIAL'
            : rejected > 0
              ? 'FAILED'
              : 'SUCCESS',
        rowsCreated: created,
        rowsUpdated: updated,
        rowsRejected: rejected,
        errorReportJson: errors,
        completedAt: new Date(),
      },
    });
  }

  async listCatalogImports(limit = 50): Promise<unknown> {
    return asCatalogPrisma(this.prisma()).catalogImport.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getCatalogImport(id: string): Promise<unknown> {
    const row = await asCatalogPrisma(this.prisma()).catalogImport.findUnique({
      where: { id },
      include: { rows: { orderBy: { rowNumber: 'asc' }, take: 200 } },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'IMPORT_NOT_FOUND',
        message: 'Catalog import not found',
      });
    }
    return row;
  }

  private enrichPublicProducts(
    products: readonly ({ id: string } & Record<string, unknown>)[],
  ): Promise<unknown[]> {
    if (products.length === 0) {
      return Promise.resolve([]);
    }
    return Promise.resolve(
      products.map((product) => {
        const image = pickPrimaryImage(
          product as Parameters<typeof pickPrimaryImage>[0],
        );
        return {
          ...product,
          primaryImageUrl: image.url,
          primaryImageAttribution: image.attribution,
          // Marketplace provenance is deferred — admin catalog is source of truth
          provenance: null,
        };
      }),
    );
  }

  private async enrichPublicProduct(
    product: { id: string } & Record<string, unknown>,
  ): Promise<unknown> {
    const [enriched] = await this.enrichPublicProducts([product]);
    return enriched;
  }
}
