ALTER TABLE "orders" ADD COLUMN "auto_rescheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dispatch_bonus_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dispatch_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "next_wave_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "next_offer_eligible_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dispatch_offers" ADD COLUMN "bonus_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

CREATE INDEX "idx_orders_next_wave_status" ON "orders" USING btree ("next_wave_at", "status");--> statement-breakpoint
CREATE INDEX "idx_workers_next_offer_eligible_active" ON "workers" USING btree ("next_offer_eligible_at", "is_active");--> statement-breakpoint
CREATE INDEX "idx_dispatch_offers_order_created_at" ON "dispatch_offers" USING btree ("order_id", "created_at");
