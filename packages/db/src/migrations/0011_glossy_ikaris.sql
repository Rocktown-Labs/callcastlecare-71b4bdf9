DO $$ BEGIN
  CREATE TYPE "public"."dispute_status" AS ENUM('open', 'under_review', 'resolved_customer', 'resolved_provider', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."checkout_item_kind" AS ENUM('lawncare', 'laundry', 'window_washing', 'home_preorder');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."checkout_session_status" AS ENUM('draft', 'pending_payment', 'paid', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."home_preorder_status" AS ENUM('pending_payment', 'paid', 'cancelled', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."home_quote_status" AS ENUM('pending', 'ready', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."quote_request_status" AS ENUM('draft', 'contact_captured', 'checkout_started', 'paid', 'abandoned', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."window_washing_package" AS ENUM('EXTERIOR_ONLY', 'FULL_SERVICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."laundry_bag_status" AS ENUM('available', 'assigned', 'in_transit', 'at_facility', 'retired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."market_mode" AS ENUM('on_demand', 'subscription_first', 'paused');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'service_before' BEFORE 'lawncare_before';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'service_after' BEFORE 'lawncare_before';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_front' BEFORE 'laundry_pickup';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_left' BEFORE 'laundry_pickup';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_right' BEFORE 'laundry_pickup';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_back' BEFORE 'laundry_pickup';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_baseline' BEFORE 'laundry_pickup';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'laundry_front' BEFORE 'laundry_pickup';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'dispute_evidence';--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE IF NOT EXISTS 'window_washing';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription" (
	"billing_interval" text,
	"cancel_at" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"id" text PRIMARY KEY NOT NULL,
	"period_end" timestamp,
	"period_start" timestamp,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"seats" integer,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"stripe_customer_id" text,
	"stripe_schedule_id" text,
	"stripe_subscription_id" text,
	"trial_end" timestamp,
	"trial_start" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkout_drafts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"payload_json" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkout_items" (
	"base_price_cents" integer NOT NULL,
	"checkout_session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"item_kind" "checkout_item_kind" NOT NULL,
	"label" text NOT NULL,
	"metadata_json" jsonb,
	"quantity" integer DEFAULT 1 NOT NULL,
	"scheduled_end_at" timestamp with time zone,
	"scheduled_start_at" timestamp with time zone,
	"timing_type" "timing_type",
	"tip_amount_cents" integer DEFAULT 0 NOT NULL,
	"total_price_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkout_sessions" (
	"address_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"customer_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"metadata_json" jsonb,
	"paid_at" timestamp with time zone,
	"status" "checkout_session_status" DEFAULT 'draft' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "home_preorders" (
	"address_id" integer NOT NULL,
	"checkout_session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"deposit_amount_cents" integer NOT NULL,
	"home_quote_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"paid_at" timestamp with time zone,
	"status" "home_preorder_status" DEFAULT 'pending_payment' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "home_quotes" (
	"address_id" integer NOT NULL,
	"confidence_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"fallback_used" boolean DEFAULT false NOT NULL,
	"home_sqft" integer,
	"id" serial PRIMARY KEY NOT NULL,
	"lot_size_sqft" integer,
	"pricing_tier" "pricing_tier",
	"quote_payload_json" jsonb,
	"radar_payload_json" jsonb,
	"status" "home_quote_status" DEFAULT 'pending' NOT NULL,
	"total_price_cents" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"zillow_payload_json" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quote_requests" (
	"address_text" text,
	"checkout_session_id" integer,
	"contact_email" text,
	"contact_name" text,
	"contact_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"last_completed_step" integer DEFAULT 0 NOT NULL,
	"payload_json" jsonb NOT NULL,
	"status" "quote_request_status" DEFAULT 'draft' NOT NULL,
	"tracking_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_disputes" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_note" text,
	"evidence_json" jsonb,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"reason" text NOT NULL,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" text,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laundry_bags" (
	"assigned_at" timestamp with time zone,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer,
	"id" serial PRIMARY KEY NOT NULL,
	"last_order_id" integer,
	"qr_payload" text NOT NULL,
	"status" "laundry_bag_status" DEFAULT 'available' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "markets" (
	"active_pro_count" integer DEFAULT 0 NOT NULL,
	"auto_on_demand_at_pros" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"label" text NOT NULL,
	"long_distance_enabled" boolean DEFAULT true NOT NULL,
	"mode" "market_mode" DEFAULT 'subscription_first' NOT NULL,
	"notes" text,
	"state_code" text NOT NULL,
	"travel_fees_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_catalog_items" (
	"active" boolean DEFAULT true NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"description" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"interval" text,
	"metadata_json" jsonb,
	"name" text NOT NULL,
	"service_type" text NOT NULL,
	"slug" text NOT NULL,
	"stripe_price_id" text,
	"stripe_product_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_coupons" (
	"active" boolean DEFAULT true NOT NULL,
	"amount_off_cents" integer,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"duration" text DEFAULT 'once' NOT NULL,
	"duration_in_months" integer,
	"id" serial PRIMARY KEY NOT NULL,
	"metadata_json" jsonb,
	"name" text NOT NULL,
	"percent_off" numeric(5, 2),
	"stripe_coupon_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_sync_runs" (
	"catalog_item_count" integer DEFAULT 0 NOT NULL,
	"coupon_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"id" serial PRIMARY KEY NOT NULL,
	"metadata_json" jsonb,
	"status" text NOT NULL,
	"stripe_webhook_endpoint_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_requests" (
	"address_text" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer,
	"email" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"metadata_json" jsonb,
	"name" text NOT NULL,
	"order_id" integer,
	"order_number" text,
	"phone" text,
	"request_type" text DEFAULT 'help' NOT NULL,
	"service_type" text,
	"source_path" text,
	"state" text,
	"status" text DEFAULT 'new' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"zip" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_tracking_points" (
	"accuracy_meters" numeric(7, 2),
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"heading" numeric(6, 2),
	"id" serial PRIMARY KEY NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"location" "geography(Point,4326)" NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"order_id" integer NOT NULL,
	"speed_mps" numeric(7, 2),
	"worker_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "window_washing_details" (
	"checkout_item_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"estimated_windows" integer NOT NULL,
	"has_screen_cleaning" boolean DEFAULT false NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"service_package" text NOT NULL,
	"story_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "formatted_address" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "instructions" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "label" text DEFAULT 'Address' NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "location" "geography(Point,4326)";--> statement-breakpoint
ALTER TABLE "dispatch_batches" ADD COLUMN IF NOT EXISTS "bonus_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "auto_rescheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "checkout_session_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispatch_bonus_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispatch_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispatch_window_end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "next_wave_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tip_settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "travel_distance_miles" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "travel_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "location" "geography(Point,4326)";--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "next_offer_eligible_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "checkout_drafts" ADD CONSTRAINT "checkout_drafts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "home_preorders" ADD CONSTRAINT "home_preorders_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "home_preorders" ADD CONSTRAINT "home_preorders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "home_preorders" ADD CONSTRAINT "home_preorders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "home_preorders" ADD CONSTRAINT "home_preorders_home_quote_id_home_quotes_id_fk" FOREIGN KEY ("home_quote_id") REFERENCES "public"."home_quotes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "home_quotes" ADD CONSTRAINT "home_quotes_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "home_quotes" ADD CONSTRAINT "home_quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_disputes" ADD CONSTRAINT "order_disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_disputes" ADD CONSTRAINT "order_disputes_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "laundry_bags" ADD CONSTRAINT "laundry_bags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "laundry_bags" ADD CONSTRAINT "laundry_bags_last_order_id_orders_id_fk" FOREIGN KEY ("last_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_tracking_points" ADD CONSTRAINT "order_tracking_points_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_tracking_points" ADD CONSTRAINT "order_tracking_points_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "window_washing_details" ADD CONSTRAINT "window_washing_details_checkout_item_id_checkout_items_id_fk" FOREIGN KEY ("checkout_item_id") REFERENCES "public"."checkout_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "window_washing_details" ADD CONSTRAINT "window_washing_details_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_stripe_customer_id_idx" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_stripe_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_checkout_drafts_customer_id" ON "checkout_drafts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_checkout_drafts_updated_at" ON "checkout_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_checkout_items_session_id" ON "checkout_items" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_checkout_sessions_customer_status" ON "checkout_sessions" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_checkout_sessions_payment_intent" ON "checkout_sessions" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_checkout_sessions_stripe_session" ON "checkout_sessions" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_home_preorders_checkout_session_id" ON "home_preorders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_home_preorders_customer_status" ON "home_preorders" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_home_quotes_customer_status" ON "home_quotes" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_home_quotes_address_id" ON "home_quotes" USING btree ("address_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_quote_requests_tracking_id" ON "quote_requests" USING btree ("tracking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quote_requests_status_updated" ON "quote_requests" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quote_requests_contact_email" ON "quote_requests" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_disputes_order_id" ON "order_disputes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_disputes_status" ON "order_disputes" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_laundry_bags_code" ON "laundry_bags" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_laundry_bags_customer_id" ON "laundry_bags" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_laundry_bags_status" ON "laundry_bags" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_markets_state_code" ON "markets" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_markets_mode" ON "markets" USING btree ("mode","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stripe_catalog_items_slug" ON "stripe_catalog_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stripe_catalog_items_service_active" ON "stripe_catalog_items" USING btree ("service_type","active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stripe_coupons_code" ON "stripe_coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stripe_coupons_active" ON "stripe_coupons" USING btree ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stripe_sync_runs_created_at" ON "stripe_sync_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_created_at" ON "support_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_email" ON "support_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_order_id" ON "support_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_status_created" ON "support_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_type" ON "support_requests" USING btree ("request_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_tracking_points_order_captured" ON "order_tracking_points" USING btree ("order_id","captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_tracking_points_worker_captured" ON "order_tracking_points" USING btree ("worker_id","captured_at");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_addresses_customer_default_unique" ON "addresses" USING btree ("customer_id") WHERE "addresses"."is_default" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addresses_formatted_address" ON "addresses" USING btree ("formatted_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dispatch_offers_order_created_at" ON "dispatch_offers" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_customer_id" ON "notifications" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_order_id" ON "notifications" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_address_id" ON "orders" USING btree ("address_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_checkout_session_id" ON "orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_next_wave_status" ON "orders" USING btree ("next_wave_at","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_quote_id" ON "orders" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_stripe_payment_intent" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workers_next_offer_eligible_active" ON "workers" USING btree ("next_offer_eligible_at","is_active");
