-- M15–M22: pgvector, AI knowledge/conversations, notifications, API keys

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS "ai";
CREATE SCHEMA IF NOT EXISTS "notifications";

-- AI enums
CREATE TYPE "ai"."KnowledgeDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "ai"."ConversationRealm" AS ENUM ('CUSTOMER', 'ADMIN');

CREATE TABLE "ai"."knowledge_documents" (
    "id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "uri" TEXT,
    "object_key" TEXT,
    "checksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ai"."KnowledgeDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_documents_status_updated_at_idx" ON "ai"."knowledge_documents"("status", "updated_at");

CREATE TABLE "ai"."knowledge_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_chunks_document_id_ordinal_key" ON "ai"."knowledge_chunks"("document_id", "ordinal");
CREATE INDEX "knowledge_chunks_content_hash_idx" ON "ai"."knowledge_chunks"("content_hash");

ALTER TABLE "ai"."knowledge_chunks"
  ADD CONSTRAINT "knowledge_chunks_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "ai"."knowledge_documents"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai"."embeddings" (
    "id" UUID NOT NULL,
    "chunk_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "dims" INTEGER NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "embeddings_chunk_id_model_idx" ON "ai"."embeddings"("chunk_id", "model");

ALTER TABLE "ai"."embeddings"
  ADD CONSTRAINT "embeddings_chunk_id_fkey"
  FOREIGN KEY ("chunk_id") REFERENCES "ai"."knowledge_chunks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai"."search_synonyms" (
    "id" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "synonym" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "search_synonyms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "search_synonyms_term_synonym_key" ON "ai"."search_synonyms"("term", "synonym");

CREATE TABLE "ai"."search_analytics_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "query" TEXT,
    "product_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "search_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "search_analytics_events_event_type_created_at_idx" ON "ai"."search_analytics_events"("event_type", "created_at");
CREATE INDEX "search_analytics_events_product_id_idx" ON "ai"."search_analytics_events"("product_id");

CREATE TABLE "ai"."conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "realm" "ai"."ConversationRealm" NOT NULL DEFAULT 'CUSTOMER',
    "title" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_user_id_updated_at_idx" ON "ai"."conversations"("user_id", "updated_at");

ALTER TABLE "ai"."conversations"
  ADD CONSTRAINT "conversations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai"."conversation_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tool_name" TEXT,
    "citations_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversation_messages_conversation_id_created_at_idx" ON "ai"."conversation_messages"("conversation_id", "created_at");

ALTER TABLE "ai"."conversation_messages"
  ADD CONSTRAINT "conversation_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "ai"."conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai"."tool_executions" (
    "id" UUID NOT NULL,
    "conversation_id" UUID,
    "tool_name" TEXT NOT NULL,
    "acting_subject" UUID NOT NULL,
    "args_json" JSONB NOT NULL,
    "result_json" JSONB,
    "ok" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tool_executions_acting_subject_created_at_idx" ON "ai"."tool_executions"("acting_subject", "created_at");
CREATE INDEX "tool_executions_tool_name_created_at_idx" ON "ai"."tool_executions"("tool_name", "created_at");

CREATE TABLE "ai"."ai_audit_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_audit_events_event_type_created_at_idx" ON "ai"."ai_audit_events"("event_type", "created_at");

-- Notifications
CREATE TYPE "notifications"."NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE "notifications"."NotificationIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE "notifications"."NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "notifications"."notification_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "notifications"."NotificationChannel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en-KE',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_templates_code_channel_locale_version_key"
  ON "notifications"."notification_templates"("code", "channel", "locale", "version");

CREATE TABLE "notifications"."notification_intents" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "notifications"."NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "template_code" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "notifications"."NotificationIntentStatus" NOT NULL DEFAULT 'PENDING',
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "notification_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_intents_idempotency_key_key" ON "notifications"."notification_intents"("idempotency_key");
CREATE INDEX "notification_intents_status_available_at_idx" ON "notifications"."notification_intents"("status", "available_at");

CREATE TABLE "notifications"."notification_deliveries" (
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "channel" "notifications"."NotificationChannel" NOT NULL,
    "status" "notifications"."NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT,
    "attempt_key" TEXT NOT NULL,
    "response_json" JSONB,
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_deliveries_attempt_key_key" ON "notifications"."notification_deliveries"("attempt_key");
CREATE INDEX "notification_deliveries_intent_id_idx" ON "notifications"."notification_deliveries"("intent_id");

ALTER TABLE "notifications"."notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_intent_id_fkey"
  FOREIGN KEY ("intent_id") REFERENCES "notifications"."notification_intents"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notifications"."communication_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "notifications"."NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "communication_preferences_user_id_channel_key"
  ON "notifications"."communication_preferences"("user_id", "channel");

-- API keys foundation (identity schema)
CREATE TABLE "identity"."api_keys" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes_json" JSONB NOT NULL,
    "organization_id" UUID,
    "created_by" UUID,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_keys_key_prefix_idx" ON "identity"."api_keys"("key_prefix");
CREATE INDEX "api_keys_key_hash_idx" ON "identity"."api_keys"("key_hash");
