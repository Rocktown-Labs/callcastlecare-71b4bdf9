CREATE TABLE "stripe_refunds" (
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"metadata_json" jsonb,
	"order_id" integer NOT NULL,
	"reason" text,
	"status" text NOT NULL,
	"stripe_refund_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stripe_refunds" ADD CONSTRAINT "stripe_refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stripe_refunds_refund_id" ON "stripe_refunds" USING btree ("stripe_refund_id");--> statement-breakpoint
CREATE INDEX "idx_stripe_refunds_order_id" ON "stripe_refunds" USING btree ("order_id");