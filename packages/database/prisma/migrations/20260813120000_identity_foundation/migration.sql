-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateEnum
CREATE TYPE "identity"."UserStatus" AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'LOCKED',
  'DEACTIVATED',
  'DELETED',
  'COMPROMISED'
);

-- CreateEnum
CREATE TYPE "identity"."CredentialType" AS ENUM (
  'PASSWORD',
  'OAUTH',
  'WEBAUTHN'
);

-- CreateEnum
CREATE TYPE "identity"."SessionRealm" AS ENUM (
  'CUSTOMER',
  'ADMIN'
);

-- CreateEnum
CREATE TYPE "identity"."MfaFactorType" AS ENUM (
  'TOTP'
);

-- CreateTable
CREATE TABLE "identity"."users" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "email_normalized" TEXT NOT NULL,
  "status" "identity"."UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "email_verified_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."organizations" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."memberships" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."roles" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."permissions" (
  "id" UUID NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."role_permissions" (
  "role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

-- CreateTable
CREATE TABLE "identity"."membership_roles" (
  "membership_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("membership_id", "role_id")
);

-- CreateTable
CREATE TABLE "identity"."credentials" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "identity"."CredentialType" NOT NULL,
  "secret_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "realm" "identity"."SessionRealm" NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "ip" TEXT,
  "user_agent" TEXT,
  "mfa_satisfied_at" TIMESTAMPTZ(3),
  "stepped_up_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."email_verification_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "used_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."password_reset_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "used_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."mfa_factors" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "identity"."MfaFactorType" NOT NULL,
  "secret_encrypted" TEXT NOT NULL,
  "verified_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."mfa_recovery_codes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code_hash" TEXT NOT NULL,
  "used_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."security_events" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "type" TEXT NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "correlation_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_key" ON "identity"."users"("email_normalized");

-- CreateIndex
CREATE INDEX "users_email_normalized_idx" ON "identity"."users"("email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "identity"."organizations"("slug");

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "identity"."memberships"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_organization_id_key" ON "identity"."memberships"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "identity"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "identity"."permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "credentials_user_id_type_idx" ON "identity"."credentials"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "identity"."sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_realm_idx" ON "identity"."sessions"("user_id", "realm");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "identity"."sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "identity"."email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "identity"."email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "identity"."password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "identity"."password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "mfa_factors_user_id_type_idx" ON "identity"."mfa_factors"("user_id", "type");

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_user_id_idx" ON "identity"."mfa_recovery_codes"("user_id");

-- CreateIndex
CREATE INDEX "security_events_user_id_created_at_idx" ON "audit"."security_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "security_events_type_created_at_idx" ON "audit"."security_events"("type", "created_at");

-- AddForeignKey
ALTER TABLE "identity"."memberships"
  ADD CONSTRAINT "memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."memberships"
  ADD CONSTRAINT "memberships_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."role_permissions"
  ADD CONSTRAINT "role_permissions_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."role_permissions"
  ADD CONSTRAINT "role_permissions_permission_id_fkey"
  FOREIGN KEY ("permission_id") REFERENCES "identity"."permissions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."membership_roles"
  ADD CONSTRAINT "membership_roles_membership_id_fkey"
  FOREIGN KEY ("membership_id") REFERENCES "identity"."memberships"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."membership_roles"
  ADD CONSTRAINT "membership_roles_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."credentials"
  ADD CONSTRAINT "credentials_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."sessions"
  ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."mfa_factors"
  ADD CONSTRAINT "mfa_factors_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."mfa_recovery_codes"
  ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit"."security_events"
  ADD CONSTRAINT "security_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
