-- Real marketplace catalog extensions (source registry, quarantine, price alerts)
-- Note: 20260820120000 created lowercase PG enum names (unquoted identifiers).

ALTER TYPE integrations.product_source_status ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE integrations.product_source_status ADD VALUE IF NOT EXISTS 'DEGRADED';
ALTER TYPE integrations.product_source_status ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE integrations.product_source_status ADD VALUE IF NOT EXISTS 'NOT_CONFIGURED';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'integrations' AND t.typname = 'source_quarantine_reason'
  ) THEN
    CREATE TYPE integrations.source_quarantine_reason AS ENUM (
      'MISSING_IDENTITY',
      'INVALID_PRICE',
      'UNSUPPORTED_CURRENCY',
      'INVALID_IMAGE_URL',
      'INVALID_SOURCE_URL',
      'INVALID_GTIN',
      'MISSING_PROVENANCE',
      'OTHER'
    );
  END IF;
END $$;

ALTER TABLE integrations.product_sources
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  ADD COLUMN IF NOT EXISTS api_version TEXT,
  ADD COLUMN IF NOT EXISTS auth_type TEXT,
  ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS terms_url TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_url_template TEXT,
  ADD COLUMN IF NOT EXISTS health_status TEXT,
  ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ(3);

CREATE TABLE IF NOT EXISTS integrations.quarantined_source_products (
  id UUID NOT NULL,
  source_id UUID NOT NULL,
  source_product_id TEXT NOT NULL,
  reason integrations.source_quarantine_reason NOT NULL,
  detail TEXT,
  raw_snapshot_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quarantined_source_products_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS quarantined_source_products_source_id_created_at_idx
  ON integrations.quarantined_source_products(source_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quarantined_source_products_source_id_fkey'
  ) THEN
    ALTER TABLE integrations.quarantined_source_products
      ADD CONSTRAINT quarantined_source_products_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES integrations.product_sources(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS integrations.price_alerts (
  id UUID NOT NULL,
  subject_id UUID NOT NULL,
  product_id UUID,
  offer_id UUID,
  target_price_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  notified_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT price_alerts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS price_alerts_subject_id_active_idx
  ON integrations.price_alerts(subject_id, active);

CREATE INDEX IF NOT EXISTS price_alerts_offer_id_active_idx
  ON integrations.price_alerts(offer_id, active);
