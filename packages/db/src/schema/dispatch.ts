import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { assignmentStatusEnum, dispatchOfferStatusEnum } from "./enums";
import { orders } from "./order";
import { workers } from "./worker";

export const dispatchBatches = pgTable(
  "dispatch_batches",
  {
    bonusCents: integer("bonus_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    radiusMiles: integer("radius_miles").notNull(),
    sequence: integer("sequence").notNull().default(1),
  },
  (table) => [index("idx_dispatch_batches_order_id").on(table.orderId)]
);

export const dispatchOffers = pgTable(
  "dispatch_offers",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dispatchBatchId: integer("dispatch_batch_id")
      .notNull()
      .references(() => dispatchBatches.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    status: dispatchOfferStatusEnum("status").notNull().default("pending"),
    workerId: integer("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_dispatch_offers_order_created_at").on(
      table.orderId,
      table.createdAt
    ),
    index("idx_dispatch_offers_order_status").on(table.orderId, table.status),
    uniqueIndex("idx_dispatch_offers_order_worker_unique").on(
      table.orderId,
      table.workerId
    ),
    index("idx_dispatch_offers_worker_status").on(table.workerId, table.status),
  ]
);

export const assignments = pgTable(
  "assignments",
  {
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dispatchOfferId: integer("dispatch_offer_id").references(
      () => dispatchOffers.id
    ),
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: assignmentStatusEnum("status").notNull().default("active"),
    workerId: integer("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_assignments_active_order")
      .on(table.orderId)
      .where(sql`${table.status} = 'active'`),
    index("idx_assignments_worker_status").on(table.workerId, table.status),
  ]
);
