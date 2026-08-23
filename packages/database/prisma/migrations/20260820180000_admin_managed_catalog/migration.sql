-- Admin-managed catalog: content origin + CSV import history

CREATE TYPE "catalog"."CatalogContentOrigin" AS ENUM ('ADMIN', 'DEMO', 'IMPORT');
CREATE TYPE "catalog"."CatalogImportStatus" AS ENUM (
  'PENDING',
  'DRY_RUN',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'PARTIAL'
);

ALTER TABLE "catalog"."products"
  ADD COLUMN IF NOT EXISTS "content_origin" "catalog"."CatalogContentOrigin" NOT NULL DEFAULT 'ADMIN';

CREATE INDEX IF NOT EXISTS "products_content_origin_idx"
  ON "catalog"."products"("content_origin");

CREATE TABLE IF NOT EXISTS "catalog"."catalog_imports" (
  "id" UUID NOT NULL,
  "filename" TEXT NOT NULL,
  "status" "catalog"."CatalogImportStatus" NOT NULL DEFAULT 'PENDING',
  "dry_run" BOOLEAN NOT NULL DEFAULT false,
  "acting_subject" UUID,
  "rows_total" INTEGER NOT NULL DEFAULT 0,
  "rows_created" INTEGER NOT NULL DEFAULT 0,
  "rows_updated" INTEGER NOT NULL DEFAULT 0,
  "rows_rejected" INTEGER NOT NULL DEFAULT 0,
  "error_report_json" JSONB NOT NULL DEFAULT '[]',
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "catalog_imports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "catalog_imports_status_created_at_idx"
  ON "catalog"."catalog_imports"("status", "created_at");

CREATE TABLE IF NOT EXISTS "catalog"."catalog_import_rows" (
  "id" UUID NOT NULL,
  "import_id" UUID NOT NULL,
  "row_number" INTEGER NOT NULL,
  "payload_json" JSONB NOT NULL,
  "ok" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,
  "product_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "catalog_import_rows_import_id_row_number_idx"
  ON "catalog"."catalog_import_rows"("import_id", "row_number");

ALTER TABLE "catalog"."catalog_import_rows"
  ADD CONSTRAINT "catalog_import_rows_import_id_fkey"
  FOREIGN KEY ("import_id") REFERENCES "catalog"."catalog_imports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
