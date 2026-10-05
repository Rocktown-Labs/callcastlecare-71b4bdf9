CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint

ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
UPDATE "customers" SET "phone" = NULL WHERE "phone" = '0000000000';--> statement-breakpoint

ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "formatted_address" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "instructions" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "label" text DEFAULT 'Address' NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "location" geography(Point,4326);--> statement-breakpoint

ALTER TABLE "workers" ADD COLUMN "location" geography(Point,4326);--> statement-breakpoint

CREATE TABLE "checkout_drafts" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "customer_id" integer NOT NULL,
  "id" serial PRIMARY KEY NOT NULL,
  "payload_json" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "order_tracking_points" (
  "accuracy_meters" numeric(7, 2),
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "heading" numeric(6, 2),
  "id" serial PRIMARY KEY NOT NULL,
  "latitude" numeric(10, 8) NOT NULL,
  "location" geography(Point,4326) NOT NULL,
  "longitude" numeric(11, 8) NOT NULL,
  "order_id" integer NOT NULL,
  "speed_mps" numeric(7, 2),
  "worker_id" integer NOT NULL
);
--> statement-breakpoint

ALTER TABLE "checkout_drafts"
ADD CONSTRAINT "checkout_drafts_customer_id_customers_id_fk"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "order_tracking_points"
ADD CONSTRAINT "order_tracking_points_order_id_orders_id_fk"
FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tracking_points"
ADD CONSTRAINT "order_tracking_points_worker_id_workers_id_fk"
FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "idx_checkout_drafts_customer_id" ON "checkout_drafts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_drafts_updated_at" ON "checkout_drafts" USING btree ("updated_at");--> statement-breakpoint

CREATE INDEX "idx_order_tracking_points_order_captured" ON "order_tracking_points" USING btree ("order_id", "captured_at");--> statement-breakpoint
CREATE INDEX "idx_order_tracking_points_worker_captured" ON "order_tracking_points" USING btree ("worker_id", "captured_at");--> statement-breakpoint
CREATE INDEX "idx_order_tracking_points_location" ON "order_tracking_points" USING gist ("location");--> statement-breakpoint

CREATE INDEX "idx_addresses_location_geog" ON "addresses" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_workers_location_geog" ON "workers" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_addresses_customer_default_unique" ON "addresses" USING btree ("customer_id") WHERE "is_default" = true;--> statement-breakpoint

UPDATE "addresses"
SET
  "formatted_address" = CONCAT_WS(', ', "street", "city", CONCAT_WS(' ', "state", "zip"), "country")
WHERE "formatted_address" IS NULL;--> statement-breakpoint

UPDATE "addresses"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL
  AND "location" IS NULL;--> statement-breakpoint

UPDATE "workers"
SET "location" = ST_SetSRID(ST_MakePoint("current_longitude", "current_latitude"), 4326)::geography
WHERE "current_latitude" IS NOT NULL
  AND "current_longitude" IS NOT NULL
  AND "location" IS NULL;
