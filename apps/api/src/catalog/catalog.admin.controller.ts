import { z } from '@buying-bot/validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CsrfGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
  RealmGuard,
  RequireMfa,
  RequirePermissions,
  RequireRealm,
  SessionAuthGuard,
} from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  type CatalogImportBody,
  catalogImportSchema,
  type CreateBrandBody,
  createBrandSchema,
  type CreateCategoryBody,
  createCategorySchema,
  type CreateMediaBody,
  createMediaSchema,
  type CreateOfferBody,
  createOfferSchema,
  type CreateProductBody,
  createProductSchema,
  digitalProductTypeSchema,
  type UpdateCategoryBody,
  updateCategorySchema,
  type UpdateOfferBody,
  updateOfferSchema,
  type UpdateProductBody,
  updateProductSchema,
  type UploadMediaBody,
  uploadMediaSchema,
} from './catalog.schemas.js';
import { CatalogService } from './catalog.service.js';

@Controller('v1/admin/catalog')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
export class CatalogAdminController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Post('brands')
  @RequirePermissions('catalog:create')
  createBrand(
    @Body(new ZodValidationPipe(createBrandSchema)) body: CreateBrandBody,
  ): Promise<unknown> {
    return this.catalog.createBrand(body);
  }

  @Post('categories')
  @RequirePermissions('catalog:create')
  createCategory(
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryBody,
  ): Promise<unknown> {
    return this.catalog.createCategory(body);
  }

  @Patch('categories/:id')
  @RequirePermissions('catalog:update')
  updateCategory(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryBody,
  ): Promise<unknown> {
    return this.catalog.updateCategory(id, body);
  }

  @Post('products')
  @RequirePermissions('catalog:create')
  createProduct(
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductBody,
  ): Promise<unknown> {
    return this.catalog.createProduct(body);
  }

  @Patch('products/:id')
  @RequirePermissions('catalog:update')
  updateProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductBody,
  ): Promise<unknown> {
    return this.catalog.updateProduct(id, body);
  }

  @Post('products/:id/publish')
  @RequirePermissions('catalog:update')
  publishProduct(@Param('id') id: string): Promise<unknown> {
    return this.catalog.publishProduct(id);
  }

  @Post('products/:id/unpublish')
  @RequirePermissions('catalog:update')
  unpublishProduct(@Param('id') id: string): Promise<unknown> {
    return this.catalog.unpublishProduct(id);
  }

  @Post('products/:id/archive')
  @RequirePermissions('catalog:update')
  archiveProduct(@Param('id') id: string): Promise<unknown> {
    return this.catalog.archiveProduct(id);
  }

  @Get('products')
  @RequirePermissions('catalog:read')
  listProducts(
    @Query(
      new ZodValidationPipe(
        z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          status: z.string().trim().min(1).optional(),
          q: z.string().trim().min(1).optional(),
          categoryId: z.string().uuid().optional(),
          digitalType: digitalProductTypeSchema.optional(),
        }),
      ),
    )
    query: {
      page: number;
      pageSize: number;
      status?: string;
      q?: string;
      categoryId?: string;
      digitalType?: string;
    },
  ): Promise<unknown> {
    return this.catalog.adminListProducts(query);
  }

  @Get('products/:id')
  @RequirePermissions('catalog:read')
  getProduct(@Param('id') id: string): Promise<unknown> {
    return this.catalog.adminGetProduct(id);
  }

  @Post('offers')
  @RequirePermissions('catalog:create')
  createOffer(
    @Body(new ZodValidationPipe(createOfferSchema)) body: CreateOfferBody,
  ): Promise<unknown> {
    return this.catalog.createOffer(body);
  }

  @Patch('offers/:id')
  @RequirePermissions('catalog:update')
  updateOffer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOfferSchema)) body: UpdateOfferBody,
  ): Promise<unknown> {
    return this.catalog.updateOffer(id, body);
  }

  @Post('media')
  @RequirePermissions('catalog:create')
  createMedia(
    @Body(new ZodValidationPipe(createMediaSchema)) body: CreateMediaBody,
  ): Promise<unknown> {
    return this.catalog.createMedia(body);
  }

  @Post('media/upload')
  @RequirePermissions('catalog:create')
  uploadMedia(
    @Body(new ZodValidationPipe(uploadMediaSchema)) body: UploadMediaBody,
  ): Promise<unknown> {
    return this.catalog.uploadMediaBinary(body);
  }

  @Delete('media/:id')
  @RequirePermissions('catalog:update')
  deleteMedia(@Param('id') id: string): Promise<unknown> {
    return this.catalog.deleteMedia(id);
  }

  @Post('imports')
  @RequirePermissions('catalog:create')
  submitImport(
    @Body(new ZodValidationPipe(catalogImportSchema)) body: CatalogImportBody,
  ): Promise<unknown> {
    return this.catalog.submitCatalogImport({
      filename: body.filename,
      csvText: body.csvText,
      dryRun: body.dryRun,
    });
  }

  @Get('imports')
  @RequirePermissions('catalog:read')
  listImports(): Promise<unknown> {
    return this.catalog.listCatalogImports();
  }

  @Get('imports/:id')
  @RequirePermissions('catalog:read')
  getImport(@Param('id') id: string): Promise<unknown> {
    return this.catalog.getCatalogImport(id);
  }
}
