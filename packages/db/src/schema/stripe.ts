import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const stripeCatalogItems = pgTable(
  "stripe_catalog_items",
  {
    active: boolean("active").notNull().default(true),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currency: text("currency").notNull().default("usd"),
    description: text("description").notNull(),
    id: serial("id").primaryKey(),
    interval: text("interval"),
    metadataJson: jsonb("metadata_json"),
    name: text("name").notNull(),
    serviceType: text("service_type").notNull(),
    slug: text("slug").notNull(),
    stripePriceId: text("stripe_price_id"),
    stripeProductId: text("stripe_product_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_stripe_catalog_items_slug").on(table.slug),
    index("idx_stripe_catalog_items_service_active").on(
      table.serviceType,
      table.active
    ),
  ]
);

export const stripeCoupons = pgTable(
  "stripe_coupons",
  {
    active: boolean("active").notNull().default(true),
    amountOffCents: integer("amount_off_cents"),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currency: text("currency").notNull().default("usd"),
    duration: text("duration").notNull().default("once"),
    durationInMonths: integer("duration_in_months"),
    id: serial("id").primaryKey(),
    metadataJson: jsonb("metadata_json"),
    name: text("name").notNull(),
    percentOff: numeric("percent_off", {
      mode: "number",
      precision: 5,
      scale: 2,
    }),
    stripeCouponId: text("stripe_coupon_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_stripe_coupons_code").on(table.code),
    index("idx_stripe_coupons_active").on(table.active),
  ]
);

export const stripeSyncRuns = pgTable(
  "stripe_sync_runs",
  {
    catalogItemCount: integer("catalog_item_count").notNull().default(0),
    couponCount: integer("coupon_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    errorMessage: text("error_message"),
    id: serial("id").primaryKey(),
    metadataJson: jsonb("metadata_json"),
    status: text("status").notNull(),
    stripeWebhookEndpointId: text("stripe_webhook_endpoint_id"),
  },
  (table) => [index("idx_stripe_sync_runs_created_at").on(table.createdAt)]
);
