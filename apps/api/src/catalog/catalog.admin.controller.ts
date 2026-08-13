import { z } from '@buying-bot/validation';
import {
  Body,
  Controller,
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
  type UpdateProductBody,
  updateProductSchema,
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
        }),
      ),
    )
    query: {
      page: number;
      pageSize: number;
      status?: string;
      q?: string;
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

  @Post('media')
  @RequirePermissions('catalog:create')
  createMedia(
    @Body(new ZodValidationPipe(createMediaSchema)) body: CreateMediaBody,
  ): Promise<unknown> {
    return this.catalog.createMedia(body);
  }
}
