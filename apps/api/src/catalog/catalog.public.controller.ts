import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CsrfGuard, Public, SessionAuthGuard } from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  type ProductListQuery,
  productListQuerySchema,
} from './catalog.schemas.js';
import { CatalogService } from './catalog.service.js';

@Controller('v1')
@UseGuards(CsrfGuard, SessionAuthGuard)
export class CatalogPublicController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Get('products')
  @Public()
  list(
    @Query(new ZodValidationPipe(productListQuerySchema))
    query: ProductListQuery,
  ): Promise<unknown> {
    return this.catalog.listProducts(query);
  }

  @Get('products/:idOrSlug')
  @Public()
  detail(@Param('idOrSlug') idOrSlug: string): Promise<unknown> {
    return this.catalog.getProduct(idOrSlug);
  }

  @Get('products/:idOrSlug/related')
  @Public()
  related(@Param('idOrSlug') idOrSlug: string): Promise<unknown> {
    return this.catalog.getRelatedProducts(idOrSlug);
  }

  @Get('categories')
  @Public()
  categories(): Promise<unknown> {
    return this.catalog.listCategories();
  }

  @Get('brands')
  @Public()
  brands(): Promise<unknown> {
    return this.catalog.listBrands();
  }

  @Get('search/products')
  @Public()
  search(
    @Query(new ZodValidationPipe(productListQuerySchema))
    query: ProductListQuery,
  ): Promise<unknown> {
    return this.catalog.searchProducts(query);
  }
}
