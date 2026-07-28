CREATE TYPE "public"."checkout_item_kind" AS ENUM('lawncare', 'laundry', 'home_preorder');--> statement-breakpoint
CREATE TYPE "public"."checkout_session_status" AS ENUM('draft', 'pending_payment', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."home_preorder_status" AS ENUM('pending_payment', 'paid', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."home_quote_status" AS ENUM('pending', 'ready', 'expired');--> statement-breakpoint

CREATE TABLE "checkout_sessions" (
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

CREATE TABLE "checkout_items" (
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

CREATE TABLE "home_quotes" (
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

CREATE TABLE "home_preorders" (
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

ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_session_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dispatch_window_end_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "checkout_sessions"
ADD CONSTRAINT "checkout_sessions_address_id_addresses_id_fk"
FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions"
ADD CONSTRAINT "checkout_sessions_customer_id_customers_id_fk"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "checkout_items"
ADD CONSTRAINT "checkout_items_checkout_session_id_checkout_sessions_id_fk"
FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "home_quotes"
ADD CONSTRAINT "home_quotes_address_id_addresses_id_fk"
FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_quotes"
ADD CONSTRAINT "home_quotes_customer_id_customers_id_fk"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "home_preorders"
ADD CONSTRAINT "home_preorders_address_id_addresses_id_fk"
FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_preorders"
ADD CONSTRAINT "home_preorders_checkout_session_id_checkout_sessions_id_fk"
FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_preorders"
ADD CONSTRAINT "home_preorders_customer_id_customers_id_fk"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_preorders"
ADD CONSTRAINT "home_preorders_home_quote_id_home_quotes_id_fk"
FOREIGN KEY ("home_quote_id") REFERENCES "public"."home_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "orders"
ADD CONSTRAINT "orders_checkout_session_id_checkout_sessions_id_fk"
FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "idx_checkout_sessions_customer_status" ON "checkout_sessions" USING btree ("customer_id", "status");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_payment_intent" ON "checkout_sessions" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_items_session_id" ON "checkout_items" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "idx_home_quotes_customer_status" ON "home_quotes" USING btree ("customer_id", "status");--> statement-breakpoint
CREATE INDEX "idx_home_quotes_address_id" ON "home_quotes" USING btree ("address_id");--> statement-breakpoint
CREATE INDEX "idx_home_preorders_checkout_session_id" ON "home_preorders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "idx_home_preorders_customer_status" ON "home_preorders" USING btree ("customer_id", "status");--> statement-breakpoint
CREATE INDEX "idx_orders_checkout_session_id" ON "orders" USING btree ("checkout_session_id");
