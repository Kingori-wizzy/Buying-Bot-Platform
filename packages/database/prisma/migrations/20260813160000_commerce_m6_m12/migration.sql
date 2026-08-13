-- Commerce domain schemas (M6–M12)
CREATE SCHEMA IF NOT EXISTS "catalog";
CREATE SCHEMA IF NOT EXISTS "inventory";
CREATE SCHEMA IF NOT EXISTS "promotions";
CREATE SCHEMA IF NOT EXISTS "cart";
CREATE SCHEMA IF NOT EXISTS "orders";
CREATE SCHEMA IF NOT EXISTS "payments";
CREATE SCHEMA IF NOT EXISTS "integrations";

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
-- OPEN: pgvector not enabled on postgres:16-alpine; ProductSearchDocument uses text FTS only.
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE "catalog"."ProductLifecycle" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "catalog"."MediaAssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');
CREATE TYPE "inventory"."InventoryMovementType" AS ENUM ('ADJUSTMENT', 'RECEIPT', 'RESERVATION', 'SALE', 'RELEASE', 'RETURN', 'DAMAGE');
CREATE TYPE "inventory"."ReservationStatus" AS ENUM ('HELD', 'COMMITTED', 'RELEASED', 'EXPIRED');
CREATE TYPE "cart"."CartStatus" AS ENUM ('ACTIVE', 'ABANDONED', 'EXPIRED', 'CONVERTED');
CREATE TYPE "orders"."OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'FAILED', 'RECONCILIATION_HOLD');
CREATE TYPE "orders"."OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');
CREATE TYPE "payments"."PaymentStatus" AS ENUM ('PENDING', 'INITIATED', 'CONFIRMED', 'FAILED', 'CANCELLED');
CREATE TYPE "payments"."PaymentAttemptStatus" AS ENUM ('CREATED', 'INITIATED', 'CONFIRMED', 'FAILED', 'EXPIRED');
CREATE TYPE "payments"."PaymentTransactionType" AS ENUM ('CHARGE', 'REFUND');
CREATE TYPE "payments"."PaymentTransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
CREATE TYPE "promotions"."PromotionType" AS ENUM ('PERCENT_OFF_ITEM', 'FIXED_OFF_ITEM', 'PERCENT_OFF_CART', 'FIXED_OFF_CART');
CREATE TYPE "promotions"."CouponStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXPIRED');

-- Catalog
CREATE TABLE "catalog"."brands" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brands_slug_key" ON "catalog"."brands"("slug");

CREATE TABLE "catalog"."categories" (
  "id" UUID NOT NULL,
  "parent_id" UUID,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_slug_key" ON "catalog"."categories"("slug");
CREATE INDEX "categories_parent_id_idx" ON "catalog"."categories"("parent_id");

CREATE TABLE "catalog"."attribute_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "data_type" TEXT NOT NULL,
  "is_variant_axis" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attribute_definitions_code_key" ON "catalog"."attribute_definitions"("code");

CREATE TABLE "catalog"."products" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "short_description" TEXT,
  "description" TEXT,
  "status" "catalog"."ProductLifecycle" NOT NULL DEFAULT 'DRAFT',
  "brand_id" UUID,
  "primary_category_id" UUID,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "products_slug_key" ON "catalog"."products"("slug");
CREATE INDEX "products_status_idx" ON "catalog"."products"("status");
CREATE INDEX "products_brand_id_idx" ON "catalog"."products"("brand_id");
CREATE INDEX "products_primary_category_id_idx" ON "catalog"."products"("primary_category_id");

CREATE TABLE "catalog"."product_attribute_values" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "attribute_definition_id" UUID NOT NULL,
  "value_text" TEXT NOT NULL,
  CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_attribute_values_product_id_attribute_definition_id_key" ON "catalog"."product_attribute_values"("product_id", "attribute_definition_id");

CREATE TABLE "catalog"."variants" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "option_json" JSONB,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "variants_product_id_idx" ON "catalog"."variants"("product_id");

CREATE TABLE "catalog"."skus" (
  "id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "internal_sku" TEXT NOT NULL,
  "seller_sku" TEXT,
  "barcode" TEXT,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "skus_variant_id_key" ON "catalog"."skus"("variant_id");
CREATE UNIQUE INDEX "skus_internal_sku_key" ON "catalog"."skus"("internal_sku");

CREATE TABLE "catalog"."offers" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "list_price_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
  "tax_class" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "offers_sku_id_active_idx" ON "catalog"."offers"("sku_id", "active");
CREATE INDEX "offers_organization_id_idx" ON "catalog"."offers"("organization_id");

CREATE TABLE "catalog"."price_windows" (
  "id" UUID NOT NULL,
  "offer_id" UUID NOT NULL,
  "sale_price_minor" INTEGER NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3),
  "priority" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "price_windows_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "price_windows_offer_id_starts_at_ends_at_idx" ON "catalog"."price_windows"("offer_id", "starts_at", "ends_at");

CREATE TABLE "catalog"."media_assets" (
  "id" UUID NOT NULL,
  "object_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "status" "catalog"."MediaAssetStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog"."product_media" (
  "product_id" UUID NOT NULL,
  "media_asset_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "product_media_pkey" PRIMARY KEY ("product_id", "media_asset_id")
);

CREATE TABLE "catalog"."variant_media" (
  "variant_id" UUID NOT NULL,
  "media_asset_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "variant_media_pkey" PRIMARY KEY ("variant_id", "media_asset_id")
);

CREATE TABLE "catalog"."product_search_documents" (
  "product_id" UUID NOT NULL,
  "document" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_search_documents_pkey" PRIMARY KEY ("product_id")
);

-- Inventory
CREATE TABLE "inventory"."locations" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "locations_code_key" ON "inventory"."locations"("code");

CREATE TABLE "inventory"."inventory_balances" (
  "id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "on_hand" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_balances_on_hand_gte_reserved" CHECK ("on_hand" >= "reserved"),
  CONSTRAINT "inventory_balances_non_negative" CHECK ("on_hand" >= 0 AND "reserved" >= 0)
);
CREATE UNIQUE INDEX "inventory_balances_sku_id_location_id_key" ON "inventory"."inventory_balances"("sku_id", "location_id");

CREATE TABLE "inventory"."inventory_movements" (
  "id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "type" "inventory"."InventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "actor_id" UUID,
  "correlation_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_movements_idempotency_key_key" ON "inventory"."inventory_movements"("idempotency_key");
CREATE INDEX "inventory_movements_sku_id_location_id_created_at_idx" ON "inventory"."inventory_movements"("sku_id", "location_id", "created_at");

CREATE TABLE "inventory"."reservations" (
  "id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "inventory"."ReservationStatus" NOT NULL DEFAULT 'HELD',
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "order_id" UUID,
  "cart_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reservations_status_expires_at_idx" ON "inventory"."reservations"("status", "expires_at");
CREATE INDEX "reservations_order_id_idx" ON "inventory"."reservations"("order_id");
CREATE INDEX "reservations_cart_id_idx" ON "inventory"."reservations"("cart_id");

-- Promotions
CREATE TABLE "promotions"."promotions" (
  "id" UUID NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "type" "promotions"."PromotionType" NOT NULL,
  "percent_bps" INTEGER,
  "amount_minor" INTEGER,
  "currency" TEXT,
  "stackable" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "min_spend_minor" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMPTZ(3),
  "ends_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"."promotions"("code");

CREATE TABLE "promotions"."coupons" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "promotion_id" UUID NOT NULL,
  "status" "promotions"."CouponStatus" NOT NULL DEFAULT 'ACTIVE',
  "max_redemptions" INTEGER,
  "redeemed_count" INTEGER NOT NULL DEFAULT 0,
  "starts_at" TIMESTAMPTZ(3),
  "ends_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coupons_code_key" ON "promotions"."coupons"("code");

CREATE TABLE "promotions"."coupon_redemptions" (
  "id" UUID NOT NULL,
  "coupon_id" UUID NOT NULL,
  "user_id" UUID,
  "order_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_order_id_key" ON "promotions"."coupon_redemptions"("coupon_id", "order_id");
CREATE INDEX "coupon_redemptions_user_id_idx" ON "promotions"."coupon_redemptions"("user_id");

CREATE TABLE "promotions"."tax_policies" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "default_rate_bps" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "tax_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tax_policies_code_key" ON "promotions"."tax_policies"("code");

CREATE TABLE "promotions"."tax_rates" (
  "id" UUID NOT NULL,
  "tax_policy_id" UUID NOT NULL,
  "tax_class" TEXT NOT NULL,
  "rate_bps" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tax_rates_tax_policy_id_tax_class_key" ON "promotions"."tax_rates"("tax_policy_id", "tax_class");

CREATE TABLE "promotions"."shipping_method_configs" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "flat_rate_minor" INTEGER NOT NULL,
  "free_above_minor" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "shipping_method_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipping_method_configs_code_key" ON "promotions"."shipping_method_configs"("code");

-- Cart
CREATE TABLE "cart"."carts" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "guest_token_hash" TEXT,
  "status" "cart"."CartStatus" NOT NULL DEFAULT 'ACTIVE',
  "currency" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "carts_user_id_status_idx" ON "cart"."carts"("user_id", "status");
CREATE INDEX "carts_guest_token_hash_idx" ON "cart"."carts"("guest_token_hash");

CREATE TABLE "cart"."cart_lines" (
  "id" UUID NOT NULL,
  "cart_id" UUID NOT NULL,
  "offer_id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cart_lines_cart_id_offer_id_key" ON "cart"."cart_lines"("cart_id", "offer_id");

-- Orders
CREATE TABLE "orders"."idempotency_records" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "actor_key" TEXT NOT NULL,
  "request_hash" TEXT,
  "response_json" JSONB,
  "status_code" INTEGER,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_records_key_actor_key_key" ON "orders"."idempotency_records"("key", "actor_key");

CREATE TABLE "orders"."orders" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "status" "orders"."OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "currency" TEXT NOT NULL,
  "payable_minor" INTEGER NOT NULL,
  "cart_id" UUID,
  "reservation_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"."orders"("user_id", "created_at");
CREATE INDEX "orders_status_idx" ON "orders"."orders"("status");

CREATE TABLE "orders"."order_items" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_name" TEXT NOT NULL,
  "variant_name" TEXT,
  "sku_code" TEXT NOT NULL,
  "offer_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "line_discount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_minor" INTEGER NOT NULL DEFAULT 0,
  "line_total_minor" INTEGER NOT NULL,
  "tax_class" TEXT,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_items_order_id_idx" ON "orders"."order_items"("order_id");

CREATE TABLE "orders"."order_financial_snapshots" (
  "order_id" UUID NOT NULL,
  "calculation_json" JSONB NOT NULL,
  "goods_minor" INTEGER NOT NULL,
  "discount_minor" INTEGER NOT NULL,
  "shipping_minor" INTEGER NOT NULL,
  "tax_minor" INTEGER NOT NULL,
  "payable_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "calculation_version" TEXT NOT NULL,
  CONSTRAINT "order_financial_snapshots_pkey" PRIMARY KEY ("order_id")
);

CREATE TABLE "orders"."outbox_messages" (
  "id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "status" "orders"."OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMPTZ(3),
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_messages_status_available_at_idx" ON "orders"."outbox_messages"("status", "available_at");

-- Payments
CREATE TABLE "payments"."payments" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "payments"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "msisdn_e164" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payments_order_id_idx" ON "payments"."payments"("order_id");

CREATE TABLE "payments"."payment_attempts" (
  "id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "status" "payments"."PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
  "provider_reference" TEXT,
  "provider_checkout_id" TEXT,
  "initiated_at" TIMESTAMPTZ(3),
  "confirmed_at" TIMESTAMPTZ(3),
  "failure_reason" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payment_attempts_payment_id_status_idx" ON "payments"."payment_attempts"("payment_id", "status");
CREATE INDEX "payment_attempts_provider_reference_idx" ON "payments"."payment_attempts"("provider_reference");

CREATE TABLE "payments"."payment_transactions" (
  "id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "type" "payments"."PaymentTransactionType" NOT NULL,
  "status" "payments"."PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "amount_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "provider_txn_id" TEXT,
  "raw_payload_json" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_transactions_provider_txn_id_key" ON "payments"."payment_transactions"("provider_txn_id");
CREATE INDEX "payment_transactions_payment_id_idx" ON "payments"."payment_transactions"("payment_id");

CREATE TABLE "integrations"."webhook_receipts" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "signature_valid" BOOLEAN NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "processed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webhook_receipts_provider_event_id_key" ON "integrations"."webhook_receipts"("provider", "event_id");
CREATE INDEX "webhook_receipts_created_at_idx" ON "integrations"."webhook_receipts"("created_at");

-- Foreign keys
ALTER TABLE "catalog"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "catalog"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "catalog"."brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_primary_category_id_fkey" FOREIGN KEY ("primary_category_id") REFERENCES "catalog"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "catalog"."product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_definition_id_fkey" FOREIGN KEY ("attribute_definition_id") REFERENCES "catalog"."attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."variants" ADD CONSTRAINT "variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."skus" ADD CONSTRAINT "skus_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."offers" ADD CONSTRAINT "offers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog"."offers" ADD CONSTRAINT "offers_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "catalog"."skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog"."price_windows" ADD CONSTRAINT "price_windows_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "catalog"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."product_media" ADD CONSTRAINT "product_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "catalog"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."variant_media" ADD CONSTRAINT "variant_media_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."variant_media" ADD CONSTRAINT "variant_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "catalog"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog"."product_search_documents" ADD CONSTRAINT "product_search_documents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "catalog"."skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "catalog"."skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "catalog"."skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotions"."coupons" ADD CONSTRAINT "coupons_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"."promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "promotions"."coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "promotions"."tax_rates" ADD CONSTRAINT "tax_rates_tax_policy_id_fkey" FOREIGN KEY ("tax_policy_id") REFERENCES "promotions"."tax_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cart"."carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cart"."cart_lines" ADD CONSTRAINT "cart_lines_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "cart"."carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart"."cart_lines" ADD CONSTRAINT "cart_lines_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "catalog"."offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cart"."cart_lines" ADD CONSTRAINT "cart_lines_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "catalog"."skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"."orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders"."order_financial_snapshots" ADD CONSTRAINT "order_financial_snapshots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments"."payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments"."payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments"."payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FTS support for product search (text only; no pgvector)
ALTER TABLE "catalog"."product_search_documents"
  ADD COLUMN "document_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("document", ''))) STORED;
CREATE INDEX "product_search_documents_tsv_idx" ON "catalog"."product_search_documents" USING GIN ("document_tsv");
CREATE INDEX "product_search_documents_trgm_idx" ON "catalog"."product_search_documents" USING GIN ("document" gin_trgm_ops);
