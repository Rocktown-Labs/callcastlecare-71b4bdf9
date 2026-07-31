import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { customers } from "./customer";
import { orders } from "./order";

export const laundryBagStatusEnum = pgEnum("laundry_bag_status", [
  "available",
  "assigned",
  "in_transit",
  "at_facility",
  "retired",
]);

export const laundryBags = pgTable(
  "laundry_bags",
  {
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id").references(() => customers.id),
    id: serial("id").primaryKey(),
    lastOrderId: integer("last_order_id").references(() => orders.id),
    qrPayload: text("qr_payload").notNull(),
    status: laundryBagStatusEnum("status").notNull().default("available"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_laundry_bags_code").on(table.code),
    index("idx_laundry_bags_customer_id").on(table.customerId),
    index("idx_laundry_bags_status").on(table.status),
  ]
);
