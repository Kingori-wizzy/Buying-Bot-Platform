import { z } from '@buying-bot/validation';

export const digitalProductTypeSchema = z.enum([
  'DIGITAL_ACCOUNT',
  'DIGITAL_SUBSCRIPTION',
  'DIGITAL_SERVICE',
  'DIGITAL_ACCESS',
  'DIGITAL_LICENSE',
  'DIGITAL_CREDENTIAL',
  'DIGITAL_REWARD',
  'OTHER',
]);

export const inventoryModeSchema = z.enum(['FINITE', 'UNLIMITED', 'MANUAL']);

export const digitalDeliveryMethodSchema = z.enum([
  'MANUAL',
  'ENTITLEMENT',
  'LICENSE_CODE',
  'ACCESS_INSTRUCTIONS',
  'DOWNLOAD',
  'NONE',
]);

export const createBrandSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  archived: z.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(300),
  slug: z.string().trim().min(1).max(160).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().max(20_000).optional(),
  status: z
    .enum(['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
    .optional(),
  contentOrigin: z.enum(['ADMIN', 'DEMO', 'IMPORT']).optional(),
  productKind: z.enum(['DIGITAL', 'PHYSICAL']).optional(),
  digitalType: digitalProductTypeSchema.optional().nullable(),
  features: z.array(z.string().trim().min(1).max(200)).max(40).optional(),
  requirementsText: z.string().trim().max(10_000).optional().nullable(),
  instructionsText: z.string().trim().max(10_000).optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  primaryCategoryId: z.string().uuid().optional().nullable(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  variantName: z.string().trim().min(1).max(200).optional(),
  internalSku: z.string().trim().min(1).max(100).optional(),
  listPriceMinor: z.number().int().nonnegative().optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  initialStock: z.number().int().nonnegative().optional(),
  inventoryMode: inventoryModeSchema.optional(),
  deliveryMethod: digitalDeliveryMethodSchema.optional(),
  validityDays: z.number().int().positive().max(3650).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const createOfferSchema = z.object({
  skuId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  listPriceMinor: z.number().int().nonnegative(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  taxInclusive: z.boolean().optional(),
  taxClass: z.string().trim().max(50).optional().nullable(),
  active: z.boolean().optional(),
  inventoryMode: inventoryModeSchema.optional(),
  deliveryMethod: digitalDeliveryMethodSchema.optional(),
  validityDays: z.number().int().positive().max(3650).optional().nullable(),
});

export const updateOfferSchema = z.object({
  listPriceMinor: z.number().int().nonnegative().optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  active: z.boolean().optional(),
  taxInclusive: z.boolean().optional(),
  taxClass: z.string().trim().max(50).optional().nullable(),
  inventoryMode: inventoryModeSchema.optional(),
  deliveryMethod: digitalDeliveryMethodSchema.optional(),
  validityDays: z.number().int().positive().max(3650).optional().nullable(),
});

export const createMediaSchema = z.object({
  objectKey: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(120),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'READY', 'FAILED', 'DELETED']).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  externalUrl: z.string().url().max(2048).optional(),
  attribution: z.string().trim().max(500).optional(),
});

/** Binary upload via base64 (works without multipart plugin). */
export const uploadMediaSchema = z.object({
  dataBase64: z.string().min(1).max(15_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  fileName: z.string().trim().min(1).max(255).optional(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  attribution: z.string().trim().max(500).optional(),
  altText: z.string().trim().max(500).optional(),
});

export const catalogImportSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  csvText: z.string().min(1).max(5_000_000),
  dryRun: z.boolean().default(true),
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().trim().min(1).max(160).optional(),
  brandId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
  priceMinMinor: z.coerce.number().int().nonnegative().optional(),
  priceMaxMinor: z.coerce.number().int().nonnegative().optional(),
  productKind: z.enum(['DIGITAL', 'PHYSICAL']).optional(),
  digitalType: digitalProductTypeSchema.optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).optional(),
  inStock: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((value): boolean | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      return value === 'true' || value === '1';
    }),
});

export const compareProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(2).max(5),
});

export type CreateBrandBody = z.infer<typeof createBrandSchema>;
export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type CreateOfferBody = z.infer<typeof createOfferSchema>;
export type UpdateOfferBody = z.infer<typeof updateOfferSchema>;
export type CreateMediaBody = z.infer<typeof createMediaSchema>;
export type UploadMediaBody = z.infer<typeof uploadMediaSchema>;
export type CatalogImportBody = z.infer<typeof catalogImportSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CompareProductsBody = z.infer<typeof compareProductsSchema>;
