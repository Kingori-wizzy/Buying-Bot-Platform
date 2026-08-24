-- Digital product catalog extensions (admin-managed shop).
-- Adds product kind / digital type, offer delivery/inventory mode,
-- order fulfillment statuses, and digital_fulfillments table.

CREATE TYPE "catalog"."ProductKind" AS ENUM ('DIGITAL', 'PHYSICAL');
CREATE TYPE "catalog"."DigitalProductType" AS ENUM (
  'DIGITAL_ACCOUNT',
  'DIGITAL_SUBSCRIPTION',
  'DIGITAL_SERVICE',
  'DIGITAL_ACCESS',
  'DIGITAL_LICENSE',
  'DIGITAL_CREDENTIAL',
  'DIGITAL_REWARD',
  'OTHER'
);
CREATE TYPE "catalog"."InventoryMode" AS ENUM ('FINITE', 'UNLIMITED', 'MANUAL');
CREATE TYPE "catalog"."DigitalDeliveryMethod" AS ENUM (
  'MANUAL',
  'ENTITLEMENT',
  'LICENSE_CODE',
  'ACCESS_INSTRUCTIONS',
  'DOWNLOAD',
  'NONE'
);
CREATE TYPE "catalog"."DigitalFulfillmentStatus" AS ENUM (
  'PENDING',
  'READY',
  'DELIVERED',
  'FAILED',
  'CANCELLED'
);

ALTER TYPE "orders"."OrderStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "orders"."OrderStatus" ADD VALUE IF NOT EXISTS 'FULFILLING';
ALTER TYPE "orders"."OrderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TABLE "catalog"."products"
  ADD COLUMN IF NOT EXISTS "product_kind" "catalog"."ProductKind" NOT NULL DEFAULT 'DIGITAL',
  ADD COLUMN IF NOT EXISTS "digital_type" "catalog"."DigitalProductType",
  ADD COLUMN IF NOT EXISTS "features_json" JSONB,
  ADD COLUMN IF NOT EXISTS "requirements_text" TEXT,
  ADD COLUMN IF NOT EXISTS "instructions_text" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata_json" JSONB;

CREATE INDEX IF NOT EXISTS "products_product_kind_idx" ON "catalog"."products"("product_kind");
CREATE INDEX IF NOT EXISTS "products_digital_type_idx" ON "catalog"."products"("digital_type");

ALTER TABLE "catalog"."offers"
  ADD COLUMN IF NOT EXISTS "inventory_mode" "catalog"."InventoryMode" NOT NULL DEFAULT 'FINITE',
  ADD COLUMN IF NOT EXISTS "delivery_method" "catalog"."DigitalDeliveryMethod" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "validity_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "fulfillment_hints_json" JSONB;

CREATE TABLE IF NOT EXISTS "orders"."digital_fulfillments" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "order_item_id" UUID,
  "delivery_method" "catalog"."DigitalDeliveryMethod" NOT NULL,
  "status" "catalog"."DigitalFulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  "delivery_payload_json" JSONB,
  "delivered_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "digital_fulfillments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "digital_fulfillments_order_id_idx" ON "orders"."digital_fulfillments"("order_id");
CREATE INDEX IF NOT EXISTS "digital_fulfillments_status_idx" ON "orders"."digital_fulfillments"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'digital_fulfillments_order_id_fkey'
  ) THEN
    ALTER TABLE "orders"."digital_fulfillments"
      ADD CONSTRAINT "digital_fulfillments_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
