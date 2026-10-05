import {
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { routeStatusEnum, routeStopStatusEnum } from "./enums";
import { orders } from "./order";
import { workers } from "./worker";

export const workerRoutes = pgTable(
  "worker_routes",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdByUserId: text("created_by_user_id").references(() => user.id),
    id: serial("id").primaryKey(),
    name: text("name").notNull().default("Field route"),
    routeDate: date("route_date").notNull(),
    status: routeStatusEnum("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workerId: integer("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_worker_routes_worker_date").on(
      table.workerId,
      table.routeDate
    ),
    index("idx_worker_routes_date_status").on(table.routeDate, table.status),
  ]
);

export const routeStops = pgTable(
  "route_stops",
  {
    actualArrivedAt: timestamp("actual_arrived_at", { withTimezone: true }),
    actualCompletedAt: timestamp("actual_completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
    plannedStartAt: timestamp("planned_start_at", { withTimezone: true }),
    routeId: integer("route_id")
      .notNull()
      .references(() => workerRoutes.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    status: routeStopStatusEnum("status").notNull().default("planned"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_route_stops_route_order").on(table.routeId, table.orderId),
    index("idx_route_stops_route_sequence").on(table.routeId, table.sequence),
    index("idx_route_stops_order_id").on(table.orderId),
  ]
);
