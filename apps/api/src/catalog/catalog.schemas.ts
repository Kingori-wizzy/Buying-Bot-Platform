import { z } from '@buying-bot/validation';

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

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(300),
  slug: z.string().trim().min(1).max(160).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().max(20_000).optional(),
  status: z
    .enum(['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
    .optional(),
  brandId: z.string().uuid().optional().nullable(),
  primaryCategoryId: z.string().uuid().optional().nullable(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  variantName: z.string().trim().min(1).max(200).optional(),
  internalSku: z.string().trim().min(1).max(100).optional(),
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
});

export const createMediaSchema = z.object({
  objectKey: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(120),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'READY', 'FAILED', 'DELETED']).optional(),
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
});

export type CreateBrandBody = z.infer<typeof createBrandSchema>;
export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type CreateOfferBody = z.infer<typeof createOfferSchema>;
export type CreateMediaBody = z.infer<typeof createMediaSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
