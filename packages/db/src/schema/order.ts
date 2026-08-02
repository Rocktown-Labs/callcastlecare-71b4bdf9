import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { checkoutSessions } from "./checkout";
import { addresses, customers } from "./customer";
import {
  orderStatusEnum,
  pricingTierEnum,
  serviceTypeEnum,
  timingTypeEnum,
} from "./enums";
import { quotes } from "./quote";
import { workers } from "./worker";

export const orders = pgTable(
  "orders",
  {
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    assignedWorkerId: integer("assigned_worker_id").references(
      () => workers.id
    ),
    autoRescheduledAt: timestamp("auto_rescheduled_at", {
      withTimezone: true,
    }),
    basePriceCents: integer("base_price_cents").notNull(),
    cancellationWindowEndsAt: timestamp("cancellation_window_ends_at", {
      withTimezone: true,
    }),
    checkoutSessionId: integer("checkout_session_id").references(
      () => checkoutSessions.id
    ),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    dispatchBonusCents: integer("dispatch_bonus_cents").notNull().default(0),
    dispatchStartedAt: timestamp("dispatch_started_at", {
      withTimezone: true,
    }),
    dispatchWindowEndAt: timestamp("dispatch_window_end_at", {
      withTimezone: true,
    }),
    id: serial("id").primaryKey(),
    nextWaveAt: timestamp("next_wave_at", { withTimezone: true }),
    pricingTier: pricingTierEnum("pricing_tier"),
    quoteId: integer("quote_id").references(() => quotes.id),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    searchRadiusMiles: integer("search_radius_miles").notNull().default(5),
    serviceType: serviceTypeEnum("service_type").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    timingType: timingTypeEnum("timing_type").notNull(),
    tipAmountCents: integer("tip_amount_cents").notNull().default(0),
    tipSettledAt: timestamp("tip_settled_at", { withTimezone: true }),
    totalPriceCents: integer("total_price_cents").notNull(),
    travelDistanceMiles: integer("travel_distance_miles"),
    travelFeeCents: integer("travel_fee_cents").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_orders_address_id").on(table.addressId),
    index("idx_orders_assigned_worker").on(table.assignedWorkerId),
    index("idx_orders_checkout_session_id").on(table.checkoutSessionId),
    index("idx_orders_created_at").on(table.createdAt),
    index("idx_orders_customer_id").on(table.customerId),
    index("idx_orders_next_wave_status").on(table.nextWaveAt, table.status),
    index("idx_orders_quote_id").on(table.quoteId),
    index("idx_orders_service_type").on(table.serviceType),
    index("idx_orders_status_start").on(table.status, table.scheduledStartAt),
    index("idx_orders_stripe_payment_intent").on(table.stripePaymentIntentId),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_order_items_order_id").on(table.orderId)]
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fromStatus: orderStatusEnum("from_status"),
    id: serial("id").primaryKey(),
    note: text("note"),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    toStatus: orderStatusEnum("to_status").notNull(),
    triggeredByUserId: text("triggered_by_user_id").references(() => user.id),
  },
  (table) => [
    index("idx_order_status_history_order_id").on(
      table.orderId,
      table.changedAt
    ),
  ]
);
