import { randomBytes } from 'node:crypto';

import type { PrismaClient } from '@buying-bot/database';

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base.length > 0 ? base : 'product';
}

type CatalogPrisma = PrismaClient & {
  catalogImport: {
    update: (args: unknown) => Promise<unknown>;
  };
  catalogImportRow: {
    create: (args: unknown) => Promise<unknown>;
  };
};

function asCatalogPrisma(prisma: PrismaClient): CatalogPrisma {
  return prisma as CatalogPrisma;
}

export interface CatalogImportRowPayload {
  readonly rowNumber: number;
  readonly name: string;
  readonly slug?: string;
  readonly shortDescription?: string;
  readonly description?: string;
  readonly brand?: string;
  readonly category?: string;
  readonly internalSku?: string;
  readonly listPriceMinor?: number;
  readonly currency?: string;
  readonly initialStock?: number;
  readonly status?: string;
}

/**
 * Worker-side catalog CSV commit (admin-managed products only).
 */
export async function runCatalogImportJob(
  prisma: PrismaClient,
  input: {
    importId: string;
    rows: readonly CatalogImportRowPayload[];
    parseErrors?: readonly { rowNumber: number; error: string }[];
  },
): Promise<void> {
  const catalog = asCatalogPrisma(prisma);
  const parseErrors = [...(input.parseErrors ?? [])];
  await catalog.catalogImport.update({
    where: { id: input.importId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const org = await prisma.organization.findUnique({
    where: { slug: 'platform' },
  });
  if (!org) {
    await catalog.catalogImport.update({
      where: { id: input.importId },
      data: {
        status: 'FAILED',
        errorReportJson: [{ error: 'ORG_MISSING' }],
        completedAt: new Date(),
      },
    });
    return;
  }
  const location = await prisma.location.findFirst({
    where: { code: 'DEFAULT' },
  });

  let created = 0;
  let updated = 0;
  let rejected = parseErrors.length;
  const errors = [...parseErrors];

  for (const row of input.rows) {
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
        await prisma.product.update({
          where: { id: existingSku.variant.productId },
          data: {
            name: row.name,
            shortDescription: row.shortDescription ?? undefined,
            description: row.description ?? undefined,
            brandId: brandId ?? undefined,
            primaryCategoryId: categoryId ?? undefined,
            ...( { contentOrigin: 'IMPORT' } as Record<string, unknown>),
            status: 'DRAFT',
          } as never,
        });
        if (row.listPriceMinor !== undefined) {
          const offer = await prisma.offer.findFirst({
            where: { skuId: existingSku.id, deletedAt: null },
          });
          if (offer) {
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                listPriceMinor: row.listPriceMinor,
                ...(row.currency ? { currency: row.currency } : {}),
              },
            });
          } else {
            await prisma.offer.create({
              data: {
                organizationId: org.id,
                skuId: existingSku.id,
                listPriceMinor: row.listPriceMinor,
                currency: row.currency ?? 'KES',
                active: true,
              },
            });
          }
        }
        updated += 1;
        await catalog.catalogImportRow.create({
          data: {
            importId: input.importId,
            rowNumber: row.rowNumber,
            payloadJson: row,
            ok: true,
            productId: existingSku.variant.productId,
          },
        });
      } else {
        const productSlug =
          row.slug ??
          `${slugify(row.name)}-${randomBytes(2).toString('hex')}`;
        const internalSku =
          row.internalSku ??
          `SKU-${randomBytes(4).toString('hex').toUpperCase()}`;
        const product = await prisma.product.create({
          data: {
            name: row.name,
            slug: productSlug,
            shortDescription: row.shortDescription ?? null,
            description: row.description ?? null,
            status: 'DRAFT',
            brandId,
            primaryCategoryId: categoryId,
            ...( { contentOrigin: 'IMPORT' } as Record<string, unknown>),
          } as never,
        });
        const variant = await prisma.variant.create({
          data: { productId: product.id, name: 'Default' },
        });
        const sku = await prisma.sku.create({
          data: { variantId: variant.id, internalSku },
        });
        if (row.listPriceMinor !== undefined) {
          await prisma.offer.create({
            data: {
              organizationId: org.id,
              skuId: sku.id,
              listPriceMinor: row.listPriceMinor,
              currency: row.currency ?? 'KES',
              active: true,
            },
          });
        }
        if (location && row.initialStock !== undefined) {
          await prisma.inventoryBalance.create({
            data: {
              skuId: sku.id,
              locationId: location.id,
              onHand: row.initialStock,
              reserved: 0,
            },
          });
        }
        await prisma.productSearchDocument.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            document: [
              row.name,
              row.shortDescription,
              row.description,
              internalSku,
            ]
              .filter(Boolean)
              .join(' '),
          },
          update: {
            document: [
              row.name,
              row.shortDescription,
              row.description,
              internalSku,
            ]
              .filter(Boolean)
              .join(' '),
          },
        });
        created += 1;
        await catalog.catalogImportRow.create({
          data: {
            importId: input.importId,
            rowNumber: row.rowNumber,
            payloadJson: row,
            ok: true,
            productId: product.id,
          },
        });
      }
    } catch (error) {
      rejected += 1;
      const message = error instanceof Error ? error.message : 'import failed';
      errors.push({ rowNumber: row.rowNumber, error: message });
      await catalog.catalogImportRow.create({
        data: {
          importId: input.importId,
          rowNumber: row.rowNumber,
          payloadJson: row,
          ok: false,
          error: message,
        },
      });
    }
  }

  await catalog.catalogImport.update({
    where: { id: input.importId },
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
