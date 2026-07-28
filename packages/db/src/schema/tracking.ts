import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

import { geographyPoint } from "./geo";
import { orders } from "./order";
import { workers } from "./worker";

export const orderTrackingPoints = pgTable(
  "order_tracking_points",
  {
    accuracyMeters: numeric("accuracy_meters", {
      mode: "number",
      precision: 7,
      scale: 2,
    }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    heading: numeric("heading", { mode: "number", precision: 6, scale: 2 }),
    id: serial("id").primaryKey(),
    latitude: numeric("latitude", {
      mode: "number",
      precision: 10,
      scale: 8,
    }).notNull(),
    location: geographyPoint("location").notNull(),
    longitude: numeric("longitude", {
      mode: "number",
      precision: 11,
      scale: 8,
    }).notNull(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    speedMps: numeric("speed_mps", { mode: "number", precision: 7, scale: 2 }),
    workerId: integer("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_order_tracking_points_order_captured").on(
      table.orderId,
      table.capturedAt
    ),
    index("idx_order_tracking_points_worker_captured").on(
      table.workerId,
      table.capturedAt
    ),
  ]
);
