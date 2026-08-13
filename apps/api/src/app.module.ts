import { Global, Module } from '@nestjs/common';

import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CartModule } from './cart/cart.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { HealthModule } from './health/health.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { KnowledgeModule } from './knowledge/knowledge.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ObservabilityModule } from './observability/observability.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PricingModule } from './pricing/pricing.module.js';
import { SecurityModule } from './security/security.module.js';

/**
 * Declarative module graph. Runtime providers are registered in bootstrap().
 */
@Global()
@Module({
  imports: [
    HealthModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    PricingModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    AiModule,
    KnowledgeModule,
    NotificationsModule,
    SecurityModule,
    ObservabilityModule,
  ],
})
// Nest requires a class module facade.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class AppModule {}
