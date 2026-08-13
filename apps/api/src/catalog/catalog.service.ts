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
import type {
  CreateBrandBody,
  CreateCategoryBody,
  CreateMediaBody,
  CreateOfferBody,
  CreateProductBody,
  ProductListQuery,
  UpdateProductBody,
} from './catalog.schemas.js';
import { type ProductCache, productCacheKey } from './product-cache.js';
import { slugify, slugWithSuffix } from './slug.js';

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
    const where = {
      deletedAt: null,
      status: 'ACTIVE' as const,
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.categoryId ? { primaryCategoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { slug: { contains: query.q, mode: 'insensitive' as const } },
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
        orderBy: { createdAt: 'desc' },
        include: {
          brand: true,
          primaryCategory: true,
          variants: { include: { sku: { include: { offers: true } } } },
        },
      }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
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
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        brand: true,
        primaryCategory: true,
        media: { include: { mediaAsset: true } },
        variants: {
          include: {
            sku: {
              include: { offers: { where: { active: true, deletedAt: null } } },
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
    if (this.cache) {
      const ttl = this.env?.PRODUCT_CACHE_TTL_SECONDS ?? 60;
      await this.cache.set(cacheKey, JSON.stringify(product), ttl);
      if (product.slug !== idOrSlug) {
        await this.cache.set(
          productCacheKey(product.slug),
          JSON.stringify(product),
          ttl,
        );
      }
      await this.cache.set(
        productCacheKey(product.id),
        JSON.stringify(product),
        ttl,
      );
    }
    return product;
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
        variants: { include: { sku: { include: { offers: true } } } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      items: ids.map((id) => byId.get(id)).filter(Boolean),
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
    const slug = await this.ensureUniqueSlug(
      'product',
      body.slug ?? slugify(body.name),
    );
    const internalSku =
      body.internalSku ?? `SKU-${randomBytes(4).toString('hex').toUpperCase()}`;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: body.name,
          slug,
          shortDescription: body.shortDescription ?? null,
          description: body.description ?? null,
          status: body.status ?? 'DRAFT',
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
      await tx.sku.create({
        data: {
          variantId: variant.id,
          internalSku,
        },
      });
      await tx.productSearchDocument.upsert({
        where: { productId: created.id },
        create: {
          productId: created.id,
          document: [
            created.name,
            created.shortDescription,
            created.description,
          ]
            .filter(Boolean)
            .join(' '),
        },
        update: {
          document: [
            created.name,
            created.shortDescription,
            created.description,
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
      await tx.productSearchDocument.upsert({
        where: { productId: id },
        create: {
          productId: id,
          document: [
            updated.name,
            updated.shortDescription,
            updated.description,
          ]
            .filter(Boolean)
            .join(' '),
        },
        update: {
          document: [
            updated.name,
            updated.shortDescription,
            updated.description,
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
    const where = {
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { slug: { contains: query.q, mode: 'insensitive' as const } },
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
      },
    });
  }

  async createMedia(body: CreateMediaBody): Promise<unknown> {
    const prisma = this.prisma();
    return prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          objectKey: body.objectKey,
          mimeType: body.mimeType,
          status: body.status ?? 'READY',
        },
      });
      if (body.productId) {
        await tx.productMedia.create({
          data: { productId: body.productId, mediaAssetId: asset.id },
        });
      }
      if (body.variantId) {
        await tx.variantMedia.create({
          data: { variantId: body.variantId, mediaAssetId: asset.id },
        });
      }
      return asset;
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
}
