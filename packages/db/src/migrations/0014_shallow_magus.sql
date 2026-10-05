CREATE TABLE "service_subscriptions" (
	"address_id" integer NOT NULL,
	"billing_interval" text NOT NULL,
	"cancel_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"checkout_session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"customer_id" integer NOT NULL,
	"ended_at" timestamp with time zone,
	"id" serial PRIMARY KEY NOT NULL,
	"metadata_json" jsonb,
	"plan_code" text NOT NULL,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"endpoint_kind" text NOT NULL,
	"event_type" text NOT NULL,
	"failed_at" timestamp with time zone,
	"id" serial PRIMARY KEY NOT NULL,
	"last_error" text,
	"payload_json" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"stripe_event_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "mode" text DEFAULT 'payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "order_disputes" ADD COLUMN "stripe_dispute_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "service_subscription_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subscription_period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subscription_unit_index" integer;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "order_id" integer;--> statement-breakpoint
ALTER TABLE "stripe_catalog_items" ADD COLUMN "last_sync_status" text;--> statement-breakpoint
ALTER TABLE "stripe_catalog_items" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stripe_catalog_items" ADD COLUMN "lookup_key" text;--> statement-breakpoint
ALTER TABLE "stripe_catalog_items" ADD COLUMN "stripe_mode" text;--> statement-breakpoint
ALTER TABLE "stripe_sync_runs" ADD COLUMN "stripe_mode" text;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "equipment_json" jsonb;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "stripe_account_api_version" text;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "stripe_charges_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "stripe_payouts_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "stripe_requirements_json" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_service_subscriptions_stripe_subscription_id" ON "service_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_service_subscriptions_customer_status" ON "service_subscriptions" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "idx_service_subscriptions_period_end" ON "service_subscriptions" USING btree ("current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stripe_webhook_events_event_id" ON "stripe_webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "idx_stripe_webhook_events_status" ON "stripe_webhook_events" USING btree ("status","received_at");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_subscription" ON "checkout_sessions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_order_disputes_stripe_id" ON "order_disputes" USING btree ("stripe_dispute_id");--> statement-breakpoint
CREATE INDEX "idx_orders_service_subscription" ON "orders" USING btree ("service_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_subscription_period_unit" ON "orders" USING btree ("service_subscription_id","subscription_period_start","subscription_unit_index");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payouts_order_id" ON "payouts" USING btree ("order_id");