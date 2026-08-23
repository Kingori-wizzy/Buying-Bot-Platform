-- Product source provenance + media external URL (real product ingestion phase)

ALTER TABLE catalog.media_assets
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT;

CREATE TYPE integrations.product_source_type AS ENUM (
  'MOCK',
  'CSV_FEED',
  'MERCHANT_API',
  'AFFILIATE_FEED',
  'MARKETPLACE_API'
);

CREATE TYPE integrations.product_source_status AS ENUM (
  'ACTIVE',
  'DISABLED',
  'ERROR'
);

CREATE TYPE integrations.source_sync_run_status AS ENUM (
  'RUNNING',
  'SUCCESS',
  'FAILED'
);

CREATE TYPE integrations.source_freshness_status AS ENUM (
  'VERIFIED',
  'STALE',
  'UNAVAILABLE',
  'UNKNOWN'
);

CREATE TYPE integrations.source_content_origin AS ENUM (
  'REAL_SOURCE',
  'SANDBOX',
  'TEST',
  'DEMO'
);

CREATE TABLE integrations.product_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_type integrations.product_source_type NOT NULL,
  status integrations.product_source_status NOT NULL DEFAULT 'ACTIVE',
  config_json JSONB NOT NULL DEFAULT '{}',
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  attribution_required BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ(3),
  last_success_at TIMESTAMPTZ(3),
  last_error TEXT,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE integrations.source_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES integrations.product_sources(id) ON DELETE CASCADE,
  status integrations.source_sync_run_status NOT NULL DEFAULT 'RUNNING',
  correlation_id TEXT NOT NULL,
  products_fetched INT NOT NULL DEFAULT 0,
  products_accepted INT NOT NULL DEFAULT 0,
  products_rejected INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ(3)
);

CREATE INDEX source_sync_runs_source_started_idx
  ON integrations.source_sync_runs (source_id, started_at DESC);

CREATE TABLE integrations.source_product_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES integrations.product_sources(id) ON DELETE CASCADE,
  source_product_id TEXT NOT NULL,
  source_offer_id TEXT,
  product_id UUID,
  offer_id UUID,
  sku_id UUID,
  source_url TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  title TEXT NOT NULL,
  brand_name TEXT,
  gtin TEXT,
  dedupe_key TEXT NOT NULL,
  canonical_group_id UUID,
  image_url TEXT,
  image_attribution TEXT,
  price_minor INT,
  currency TEXT,
  availability_status integrations.source_freshness_status NOT NULL DEFAULT 'UNKNOWN',
  content_origin integrations.source_content_origin NOT NULL DEFAULT 'SANDBOX',
  price_observed_at TIMESTAMPTZ(3),
  availability_observed_at TIMESTAMPTZ(3),
  last_seen_at TIMESTAMPTZ(3) NOT NULL,
  raw_snapshot_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, source_product_id)
);

CREATE INDEX source_product_records_dedupe_idx
  ON integrations.source_product_records (dedupe_key);

CREATE INDEX source_product_records_product_idx
  ON integrations.source_product_records (product_id);

CREATE TABLE integrations.price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES integrations.product_sources(id) ON DELETE CASCADE,
  source_product_record_id UUID NOT NULL REFERENCES integrations.source_product_records(id) ON DELETE CASCADE,
  offer_id UUID,
  amount_minor INT NOT NULL,
  currency TEXT NOT NULL,
  observed_at TIMESTAMPTZ(3) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX price_observations_record_observed_idx
  ON integrations.price_observations (source_product_record_id, observed_at DESC);
