CREATE TYPE "public"."assignment_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dispatch_offer_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."earning_type" AS ENUM('base_pay', 'tip', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."leg_status" AS ENUM('pending', 'en_route', 'arrived', 'started', 'stopped', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leg_type" AS ENUM('pickup', 'facility_in', 'wash', 'dry', 'fold', 'facility_out', 'dropoff');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('lawncare_before', 'lawncare_after', 'laundry_pickup', 'laundry_scan', 'laundry_folded', 'laundry_dropoff');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('push', 'sms', 'email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sending', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'quoted', 'pending_payment', 'paid', 'dispatching', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pricing_tier" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('pending', 'ready', 'expired', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('lawncare', 'laundry');--> statement-breakpoint
CREATE TYPE "public"."timing_type" AS ENUM('asap', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."worker_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "account" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" text,
	"token" text NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"conversation_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"body" text NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"sender_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"city" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"is_validated" boolean DEFAULT false NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"radar_geocode_json" jsonb,
	"state" text NOT NULL,
	"street" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"zip" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"address_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"home_sqft" integer,
	"id" serial PRIMARY KEY NOT NULL,
	"lot_size_sqft" integer,
	"source" text DEFAULT 'zillow' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"zillow_data_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatch_offer_id" integer,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"status" "assignment_status" DEFAULT 'active' NOT NULL,
	"worker_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_batches" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"radius_miles" integer NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_offers" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatch_batch_id" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"responded_at" timestamp with time zone,
	"status" "dispatch_offer_status" DEFAULT 'pending' NOT NULL,
	"worker_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leg_status_history" (
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_status" "leg_status",
	"id" serial PRIMARY KEY NOT NULL,
	"leg_id" integer NOT NULL,
	"note" text,
	"to_status" "leg_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_legs" (
	"actual_ended_at" timestamp with time zone,
	"actual_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"leg_type" "leg_type" NOT NULL,
	"order_id" integer NOT NULL,
	"scheduled_ended_at" timestamp with time zone,
	"scheduled_started_at" timestamp with time zone,
	"sequence" integer NOT NULL,
	"status" "leg_status" DEFAULT 'pending' NOT NULL,
	"worker_id" integer
);
--> statement-breakpoint
CREATE TABLE "leg_media_links" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"leg_id" integer NOT NULL,
	"media_asset_id" integer NOT NULL,
	"required_for_transition" "leg_status"
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"media_type" "media_type" NOT NULL,
	"metadata_json" jsonb,
	"storage_path" text NOT NULL,
	"uploaded_by_worker_id" integer
);
--> statement-breakpoint
CREATE TABLE "order_media_links" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"media_asset_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"required_for_transition" "order_status"
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"attempted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"provider_message_id" text,
	"status" "notification_status" DEFAULT 'queued' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"body" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"scheduled_at" timestamp with time zone,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"subject" text,
	"worker_id" integer
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"request_hash" text,
	"response_json" jsonb,
	"scope" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_key" text NOT NULL,
	"event_name" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"payload_json" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"order_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_status" "order_status",
	"id" serial PRIMARY KEY NOT NULL,
	"note" text,
	"order_id" integer NOT NULL,
	"to_status" "order_status" NOT NULL,
	"triggered_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"accepted_at" timestamp with time zone,
	"address_id" integer NOT NULL,
	"arrived_at" timestamp with time zone,
	"assigned_worker_id" integer,
	"base_price_cents" integer NOT NULL,
	"cancellation_window_ends_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"pricing_tier" "pricing_tier",
	"quote_id" integer,
	"scheduled_end_at" timestamp with time zone,
	"scheduled_start_at" timestamp with time zone,
	"search_radius_miles" integer DEFAULT 5 NOT NULL,
	"service_type" "service_type" NOT NULL,
	"started_at" timestamp with time zone,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"stripe_payment_intent_id" text,
	"timing_type" "timing_type" NOT NULL,
	"tip_amount_cents" integer DEFAULT 0 NOT NULL,
	"total_price_cents" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings_ledger" (
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"earning_type" "earning_type" NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"release_at" timestamp with time zone,
	"worker_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failure_reason" text,
	"id" serial PRIMARY KEY NOT NULL,
	"paid_at" timestamp with time zone,
	"provider_payout_id" text,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"worker_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tip_holds" (
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"released_at" timestamp with time zone,
	"scheduled_release_at" timestamp with time zone NOT NULL,
	"worker_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_line_items" (
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"quote_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_provider_requests" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_name" text NOT NULL,
	"quote_id" integer NOT NULL,
	"request_body_json" jsonb,
	"request_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_provider_results" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"provider_request_id" integer NOT NULL,
	"response_body_json" jsonb,
	"success" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"address_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"id" serial PRIMARY KEY NOT NULL,
	"input_json" jsonb,
	"service_type" "service_type" NOT NULL,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"total_price_cents" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"application_form_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_latitude" numeric(10, 8),
	"current_longitude" numeric(11, 8),
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_location_updated_at" timestamp with time zone,
	"last_name" text NOT NULL,
	"onboarding_status" "worker_status" DEFAULT 'pending' NOT NULL,
	"phone" text NOT NULL,
	"service_radius_miles" integer DEFAULT 10 NOT NULL,
	"services_offered" text[] DEFAULT '{}' NOT NULL,
	"stripe_account_id" text,
	"stripe_account_status" text DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_dispatch_offer_id_dispatch_offers_id_fk" FOREIGN KEY ("dispatch_offer_id") REFERENCES "public"."dispatch_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_batches" ADD CONSTRAINT "dispatch_batches_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_dispatch_batch_id_dispatch_batches_id_fk" FOREIGN KEY ("dispatch_batch_id") REFERENCES "public"."dispatch_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leg_status_history" ADD CONSTRAINT "leg_status_history_leg_id_service_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."service_legs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_legs" ADD CONSTRAINT "service_legs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_legs" ADD CONSTRAINT "service_legs_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leg_media_links" ADD CONSTRAINT "leg_media_links_leg_id_service_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."service_legs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leg_media_links" ADD CONSTRAINT "leg_media_links_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_worker_id_workers_id_fk" FOREIGN KEY ("uploaded_by_worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_media_links" ADD CONSTRAINT "order_media_links_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_media_links" ADD CONSTRAINT "order_media_links_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_triggered_by_user_id_user_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_worker_id_workers_id_fk" FOREIGN KEY ("assigned_worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_ledger" ADD CONSTRAINT "earnings_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_ledger" ADD CONSTRAINT "earnings_ledger_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_holds" ADD CONSTRAINT "tip_holds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_holds" ADD CONSTRAINT "tip_holds_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_provider_requests" ADD CONSTRAINT "quote_provider_requests_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_provider_results" ADD CONSTRAINT "quote_provider_results_provider_request_id_quote_provider_requests_id_fk" FOREIGN KEY ("provider_request_id") REFERENCES "public"."quote_provider_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_conversation_participants_unique" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_participants_user_id" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_order_id" ON "conversations" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_message_reads_unique" ON "message_reads" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_message_reads_user_id" ON "message_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_addresses_customer_id" ON "addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_addresses_location" ON "addresses" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_email" ON "customers" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_user_id" ON "customers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_properties_address_id" ON "properties" USING btree ("address_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_assignments_active_order" ON "assignments" USING btree ("order_id") WHERE "assignments"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_assignments_worker_status" ON "assignments" USING btree ("worker_id","status");--> statement-breakpoint
CREATE INDEX "idx_dispatch_batches_order_id" ON "dispatch_batches" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_dispatch_offers_order_status" ON "dispatch_offers" USING btree ("order_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dispatch_offers_order_worker_unique" ON "dispatch_offers" USING btree ("order_id","worker_id");--> statement-breakpoint
CREATE INDEX "idx_dispatch_offers_worker_status" ON "dispatch_offers" USING btree ("worker_id","status");--> statement-breakpoint
CREATE INDEX "idx_leg_status_history_leg_id" ON "leg_status_history" USING btree ("leg_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_service_legs_order_sequence_unique" ON "service_legs" USING btree ("order_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_service_legs_order_status" ON "service_legs" USING btree ("order_id","status");--> statement-breakpoint
CREATE INDEX "idx_leg_media_links_leg_id" ON "leg_media_links" USING btree ("leg_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leg_media_links_unique" ON "leg_media_links" USING btree ("leg_id","media_asset_id");--> statement-breakpoint
CREATE INDEX "idx_media_assets_type" ON "media_assets" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "idx_order_media_links_order_id" ON "order_media_links" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_order_media_links_unique" ON "order_media_links" USING btree ("order_id","media_asset_id");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_notification_id" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_status_schedule" ON "notifications" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_idempotency_scope_key" ON "idempotency_keys" USING btree ("scope","key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_outbox_event_key_unique" ON "outbox_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "idx_outbox_status_created" ON "outbox_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history" USING btree ("order_id","changed_at");--> statement-breakpoint
CREATE INDEX "idx_orders_assigned_worker" ON "orders" USING btree ("assigned_worker_id");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_customer_id" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_service_type" ON "orders" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_orders_status_start" ON "orders" USING btree ("status","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "idx_earnings_ledger_worker_release" ON "earnings_ledger" USING btree ("worker_id","release_at");--> statement-breakpoint
CREATE INDEX "idx_earnings_ledger_order_id" ON "earnings_ledger" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payouts_worker_status" ON "payouts" USING btree ("worker_id","status");--> statement-breakpoint
CREATE INDEX "idx_tip_holds_scheduled_release" ON "tip_holds" USING btree ("scheduled_release_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tip_holds_order_id" ON "tip_holds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_quote_line_items_quote_id" ON "quote_line_items" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quote_provider_request_id" ON "quote_provider_requests" USING btree ("provider_name","request_id");--> statement-breakpoint
CREATE INDEX "idx_quote_provider_requests_quote_id" ON "quote_provider_requests" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "idx_quote_provider_results_request_id" ON "quote_provider_results" USING btree ("provider_request_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_customer_status" ON "quotes" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "idx_quotes_service_type" ON "quotes" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_workers_active" ON "workers" USING btree ("is_active") WHERE "workers"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workers_email" ON "workers" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "idx_workers_location" ON "workers" USING btree ("current_latitude","current_longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workers_user_id" ON "workers" USING btree ("user_id");