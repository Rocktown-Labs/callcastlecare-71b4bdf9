CREATE TABLE IF NOT EXISTS "support_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "request_type" text DEFAULT 'help' NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "message" text NOT NULL,
  "order_id" integer,
  "order_number" text,
  "address_text" text,
  "city" text,
  "state" text,
  "zip" text,
  "service_type" text,
  "source_path" text,
  "customer_id" integer,
  "user_id" text,
  "metadata_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "support_requests"
    ADD CONSTRAINT "support_requests_order_id_orders_id_fk"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "support_requests"
    ADD CONSTRAINT "support_requests_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "support_requests"
    ADD CONSTRAINT "support_requests_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_support_requests_created_at" ON "support_requests" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_email" ON "support_requests" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_order_id" ON "support_requests" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_status_created" ON "support_requests" ("status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_requests_type" ON "support_requests" ("request_type");
