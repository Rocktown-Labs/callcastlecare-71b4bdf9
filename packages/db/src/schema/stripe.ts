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

import { checkoutSessions } from "./checkout";
import { addresses, customers } from "./customer";
import { orders } from "./order";

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
    lastSyncStatus: text("last_sync_status"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lookupKey: text("lookup_key"),
    metadataJson: jsonb("metadata_json"),
    name: text("name").notNull(),
    serviceType: text("service_type").notNull(),
    slug: text("slug").notNull(),
    stripeMode: text("stripe_mode"),
    stripePriceId: text("stripe_price_id"),
    stripeProductId: text("stripe_product_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_stripe_catalog_items_slug").on(table.slug),
    uniqueIndex("idx_stripe_catalog_items_lookup_key").on(table.lookupKey),
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
    stripeMode: text("stripe_mode"),
    stripeWebhookEndpointId: text("stripe_webhook_endpoint_id"),
  },
  (table) => [index("idx_stripe_sync_runs_created_at").on(table.createdAt)]
);

export const stripeRefunds = pgTable(
  "stripe_refunds",
  {
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    metadataJson: jsonb("metadata_json"),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    reason: text("reason"),
    status: text("status").notNull(),
    stripeRefundId: text("stripe_refund_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_stripe_refunds_refund_id").on(table.stripeRefundId),
    index("idx_stripe_refunds_order_id").on(table.orderId),
  ]
);

export const stripeWebhookEvents = pgTable(
  "stripe_webhook_events",
  {
    attemptCount: integer("attempt_count").notNull().default(0),
    endpointKind: text("endpoint_kind").notNull(),
    eventType: text("event_type").notNull(),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    id: serial("id").primaryKey(),
    lastError: text("last_error"),
    payloadJson: jsonb("payload_json").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("received"),
    stripeEventId: text("stripe_event_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_stripe_webhook_events_event_id").on(table.stripeEventId),
    index("idx_stripe_webhook_events_status").on(
      table.status,
      table.receivedAt
    ),
  ]
);

export const serviceSubscriptions = pgTable(
  "service_subscriptions",
  {
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id),
    billingInterval: text("billing_interval").notNull(),
    cancelAt: timestamp("cancel_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    checkoutSessionId: integer("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    id: serial("id").primaryKey(),
    metadataJson: jsonb("metadata_json"),
    planCode: text("plan_code").notNull(),
    status: text("status").notNull().default("incomplete"),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_service_subscriptions_stripe_subscription_id").on(
      table.stripeSubscriptionId
    ),
    index("idx_service_subscriptions_customer_status").on(
      table.customerId,
      table.status
    ),
    index("idx_service_subscriptions_period_end").on(table.currentPeriodEnd),
  ]
);
