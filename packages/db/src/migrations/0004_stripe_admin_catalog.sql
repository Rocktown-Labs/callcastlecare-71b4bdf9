ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_expires" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_reason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonated_by" text;

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" text PRIMARY KEY NOT NULL,
  "plan" text NOT NULL,
  "reference_id" text NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "status" text DEFAULT 'incomplete' NOT NULL,
  "period_start" timestamp,
  "period_end" timestamp,
  "trial_start" timestamp,
  "trial_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "cancel_at" timestamp,
  "canceled_at" timestamp,
  "ended_at" timestamp,
  "seats" integer,
  "billing_interval" text,
  "stripe_schedule_id" text
);

CREATE INDEX IF NOT EXISTS "subscription_reference_id_idx" ON "subscription" ("reference_id");
CREATE INDEX IF NOT EXISTS "subscription_stripe_customer_id_idx" ON "subscription" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "subscription_stripe_subscription_id_idx" ON "subscription" ("stripe_subscription_id");

CREATE TABLE IF NOT EXISTS "stripe_catalog_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "service_type" text NOT NULL,
  "description" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "interval" text,
  "active" boolean DEFAULT true NOT NULL,
  "stripe_product_id" text,
  "stripe_price_id" text,
  "metadata_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_stripe_catalog_items_slug" ON "stripe_catalog_items" ("slug");
CREATE INDEX IF NOT EXISTS "idx_stripe_catalog_items_service_active" ON "stripe_catalog_items" ("service_type", "active");

CREATE TABLE IF NOT EXISTS "stripe_coupons" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "percent_off" numeric(5, 2),
  "amount_off_cents" integer,
  "currency" text DEFAULT 'usd' NOT NULL,
  "duration" text DEFAULT 'once' NOT NULL,
  "duration_in_months" integer,
  "active" boolean DEFAULT true NOT NULL,
  "stripe_coupon_id" text,
  "metadata_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_stripe_coupons_code" ON "stripe_coupons" ("code");
CREATE INDEX IF NOT EXISTS "idx_stripe_coupons_active" ON "stripe_coupons" ("active");

CREATE TABLE IF NOT EXISTS "stripe_sync_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "status" text NOT NULL,
  "catalog_item_count" integer DEFAULT 0 NOT NULL,
  "coupon_count" integer DEFAULT 0 NOT NULL,
  "stripe_webhook_endpoint_id" text,
  "error_message" text,
  "metadata_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stripe_sync_runs_created_at" ON "stripe_sync_runs" ("created_at");
