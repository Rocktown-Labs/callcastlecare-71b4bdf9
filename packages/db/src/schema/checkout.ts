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

import { addresses, customers } from "./customer";
import {
  checkoutItemKindEnum,
  checkoutSessionStatusEnum,
  homePreorderStatusEnum,
  homeQuoteStatusEnum,
  pricingTierEnum,
  quoteRequestStatusEnum,
  timingTypeEnum,
} from "./enums";

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currency: text("currency").notNull().default("usd"),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    id: serial("id").primaryKey(),
    metadataJson: jsonb("metadata_json"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    status: checkoutSessionStatusEnum("status").notNull().default("draft"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_checkout_sessions_customer_status").on(
      table.customerId,
      table.status
    ),
    index("idx_checkout_sessions_payment_intent").on(
      table.stripePaymentIntentId
    ),
    index("idx_checkout_sessions_stripe_session").on(
      table.stripeCheckoutSessionId
    ),
  ]
);

export const checkoutItems = pgTable(
  "checkout_items",
  {
    basePriceCents: integer("base_price_cents").notNull(),
    checkoutSessionId: integer("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    itemKind: checkoutItemKindEnum("item_kind").notNull(),
    label: text("label").notNull(),
    metadataJson: jsonb("metadata_json"),
    quantity: integer("quantity").notNull().default(1),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    timingType: timingTypeEnum("timing_type"),
    tipAmountCents: integer("tip_amount_cents").notNull().default(0),
    totalPriceCents: integer("total_price_cents").notNull(),
  },
  (table) => [
    index("idx_checkout_items_session_id").on(table.checkoutSessionId),
  ]
);

export const homeQuotes = pgTable(
  "home_quotes",
  {
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id),
    confidenceScore: numeric("confidence_score", {
      mode: "number",
      precision: 5,
      scale: 2,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    fallbackUsed: boolean("fallback_used").notNull().default(false),
    homeSqft: integer("home_sqft"),
    id: serial("id").primaryKey(),
    lotSizeSqft: integer("lot_size_sqft"),
    pricingTier: pricingTierEnum("pricing_tier"),
    quotePayloadJson: jsonb("quote_payload_json"),
    radarPayloadJson: jsonb("radar_payload_json"),
    status: homeQuoteStatusEnum("status").notNull().default("pending"),
    totalPriceCents: integer("total_price_cents"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    zillowPayloadJson: jsonb("zillow_payload_json"),
  },
  (table) => [
    index("idx_home_quotes_customer_status").on(table.customerId, table.status),
    index("idx_home_quotes_address_id").on(table.addressId),
  ]
);

export const homePreorders = pgTable(
  "home_preorders",
  {
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id),
    checkoutSessionId: integer("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    depositAmountCents: integer("deposit_amount_cents").notNull(),
    homeQuoteId: integer("home_quote_id")
      .notNull()
      .references(() => homeQuotes.id),
    id: serial("id").primaryKey(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    status: homePreorderStatusEnum("status")
      .notNull()
      .default("pending_payment"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_home_preorders_checkout_session_id").on(table.checkoutSessionId),
    index("idx_home_preorders_customer_status").on(
      table.customerId,
      table.status
    ),
  ]
);

export const checkoutDrafts = pgTable(
  "checkout_drafts",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    id: serial("id").primaryKey(),
    payloadJson: jsonb("payload_json").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_checkout_drafts_customer_id").on(table.customerId),
    index("idx_checkout_drafts_updated_at").on(table.updatedAt),
  ]
);

export const quoteRequests = pgTable(
  "quote_requests",
  {
    addressText: text("address_text"),
    checkoutSessionId: integer("checkout_session_id").references(
      () => checkoutSessions.id
    ),
    contactEmail: text("contact_email"),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    lastCompletedStep: integer("last_completed_step").notNull().default(0),
    payloadJson: jsonb("payload_json").notNull(),
    status: quoteRequestStatusEnum("status").notNull().default("draft"),
    trackingId: text("tracking_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_quote_requests_tracking_id").on(table.trackingId),
    index("idx_quote_requests_status_updated").on(
      table.status,
      table.updatedAt
    ),
    index("idx_quote_requests_contact_email").on(table.contactEmail),
  ]
);
