import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { customers } from "./customer";
import { orders } from "./order";

export const supportRequests = pgTable(
  "support_requests",
  {
    addressText: text("address_text"),
    city: text("city"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id").references(() => customers.id),
    email: text("email").notNull(),
    id: serial("id").primaryKey(),
    message: text("message").notNull(),
    metadataJson: jsonb("metadata_json"),
    name: text("name").notNull(),
    orderId: integer("order_id").references(() => orders.id),
    orderNumber: text("order_number"),
    phone: text("phone"),
    requestType: text("request_type").notNull().default("help"),
    serviceType: text("service_type"),
    sourcePath: text("source_path"),
    state: text("state"),
    status: text("status").notNull().default("new"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: text("user_id").references(() => user.id),
    zip: text("zip"),
  },
  (table) => [
    index("idx_support_requests_created_at").on(table.createdAt),
    index("idx_support_requests_email").on(table.email),
    index("idx_support_requests_order_id").on(table.orderId),
    index("idx_support_requests_status_created").on(
      table.status,
      table.createdAt
    ),
    index("idx_support_requests_type").on(table.requestType),
  ]
);
