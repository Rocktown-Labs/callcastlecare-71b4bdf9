CREATE TYPE "public"."market_mode" AS ENUM('on_demand', 'subscription_first', 'paused');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'under_review', 'resolved_customer', 'resolved_provider', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."laundry_bag_status" AS ENUM('available', 'assigned', 'in_transit', 'at_facility', 'retired');--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_front';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_left';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_right';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_back';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'property_baseline';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'laundry_front';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE IF NOT EXISTS 'dispute_evidence';--> statement-breakpoint
CREATE TABLE "markets" (
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
);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_markets_state_code" ON "markets" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "idx_markets_mode" ON "markets" USING btree ("mode","is_active");--> statement-breakpoint
CREATE TABLE "order_disputes" (
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
);--> statement-breakpoint
ALTER TABLE "order_disputes" ADD CONSTRAINT "order_disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_disputes" ADD CONSTRAINT "order_disputes_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_disputes_order_id" ON "order_disputes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_disputes_status" ON "order_disputes" USING btree ("status","created_at");--> statement-breakpoint
CREATE TABLE "laundry_bags" (
	"assigned_at" timestamp with time zone,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer,
	"id" serial PRIMARY KEY NOT NULL,
	"last_order_id" integer,
	"qr_payload" text NOT NULL,
	"status" "laundry_bag_status" DEFAULT 'available' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "laundry_bags" ADD CONSTRAINT "laundry_bags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laundry_bags" ADD CONSTRAINT "laundry_bags_last_order_id_orders_id_fk" FOREIGN KEY ("last_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_laundry_bags_code" ON "laundry_bags" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_laundry_bags_customer_id" ON "laundry_bags" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_laundry_bags_status" ON "laundry_bags" USING btree ("status");--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tip_settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "travel_distance_miles" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "travel_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
INSERT INTO "markets" ("label", "state_code", "mode", "is_active", "long_distance_enabled", "travel_fees_enabled", "active_pro_count", "auto_on_demand_at_pros", "notes")
VALUES
  ('Arkansas', 'AR', 'on_demand', true, true, true, 1, 5, 'Launch market. Solo operator HQ in Searcy.'),
  ('Texas', 'TX', 'subscription_first', true, true, true, 0, 5, 'Family coverage target (DFW). Flip to on_demand when Pros are live.')
ON CONFLICT DO NOTHING;
