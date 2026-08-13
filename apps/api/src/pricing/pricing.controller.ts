import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';

import {
  CsrfGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
  Public,
  RealmGuard,
  RequireMfa,
  RequirePermissions,
  RequireRealm,
  SessionAuthGuard,
} from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  type CreateCouponBody,
  createCouponSchema,
  type CreatePromotionBody,
  createPromotionSchema,
  type ValidateCouponBody,
  validateCouponSchema,
} from './pricing.schemas.js';
import { PricingService } from './pricing.service.js';

@Controller('v1/admin/pricing')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
export class PricingAdminController {
  constructor(
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  @Get('promotions')
  @RequirePermissions('catalog:read')
  listPromotions(): Promise<unknown> {
    return this.pricing.listPromotions();
  }

  @Get('coupons')
  @RequirePermissions('catalog:read')
  listCoupons(): Promise<unknown> {
    return this.pricing.listCoupons();
  }

  @Post('promotions')
  @RequirePermissions('catalog:create')
  createPromotion(
    @Body(new ZodValidationPipe(createPromotionSchema))
    body: CreatePromotionBody,
  ): Promise<unknown> {
    return this.pricing.createPromotion(body);
  }

  @Post('coupons')
  @RequirePermissions('catalog:create')
  createCoupon(
    @Body(new ZodValidationPipe(createCouponSchema)) body: CreateCouponBody,
  ): Promise<unknown> {
    return this.pricing.createCoupon(body);
  }
}

@Controller('v1/pricing')
@UseGuards(CsrfGuard, SessionAuthGuard)
export class PricingPublicController {
  constructor(
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  @Post('coupons/validate')
  @Public()
  validate(
    @Body(new ZodValidationPipe(validateCouponSchema)) body: ValidateCouponBody,
  ): Promise<unknown> {
    return this.pricing.validateCoupon(body);
  }
}
