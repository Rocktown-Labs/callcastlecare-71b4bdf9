DO $$ BEGIN
  CREATE TYPE "public"."quote_request_status" AS ENUM (
    'draft',
    'contact_captured',
    'checkout_started',
    'paid',
    'abandoned',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quote_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "tracking_id" text NOT NULL,
  "status" "quote_request_status" DEFAULT 'draft' NOT NULL,
  "last_completed_step" integer DEFAULT 0 NOT NULL,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "address_text" text,
  "payload_json" jsonb NOT NULL,
  "checkout_session_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "quote_requests"
    ADD CONSTRAINT "quote_requests_checkout_session_id_checkout_sessions_id_fk"
    FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_quote_requests_tracking_id" ON "quote_requests" ("tracking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quote_requests_status_updated" ON "quote_requests" ("status", "updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quote_requests_contact_email" ON "quote_requests" ("contact_email");
