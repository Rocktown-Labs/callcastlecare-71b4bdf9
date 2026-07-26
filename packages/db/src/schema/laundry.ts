import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { legStatusEnum, legTypeEnum } from "./enums";
import { orders } from "./order";
import { workers } from "./worker";

export const serviceLegs = pgTable(
  "service_legs",
  {
    actualEndedAt: timestamp("actual_ended_at", { withTimezone: true }),
    actualStartedAt: timestamp("actual_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    legType: legTypeEnum("leg_type").notNull(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    scheduledEndedAt: timestamp("scheduled_ended_at", { withTimezone: true }),
    scheduledStartedAt: timestamp("scheduled_started_at", {
      withTimezone: true,
    }),
    sequence: integer("sequence").notNull(),
    status: legStatusEnum("status").notNull().default("pending"),
    workerId: integer("worker_id").references(() => workers.id),
  },
  (table) => [
    uniqueIndex("idx_service_legs_order_sequence_unique").on(
      table.orderId,
      table.sequence
    ),
    index("idx_service_legs_order_status").on(table.orderId, table.status),
  ]
);

export const legStatusHistory = pgTable(
  "leg_status_history",
  {
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fromStatus: legStatusEnum("from_status"),
    id: serial("id").primaryKey(),
    legId: integer("leg_id")
      .notNull()
      .references(() => serviceLegs.id, { onDelete: "cascade" }),
    note: text("note"),
    toStatus: legStatusEnum("to_status").notNull(),
  },
  (table) => [
    index("idx_leg_status_history_leg_id").on(table.legId, table.changedAt),
  ]
);
