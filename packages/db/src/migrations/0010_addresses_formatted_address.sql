ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "formatted_address" text;
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "instructions" text;
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "label" text DEFAULT 'Address' NOT NULL;
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "location" geography(Point,4326);
