import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { customers } from "./customer";
import { notificationChannelEnum, notificationStatusEnum } from "./enums";
import { orders } from "./order";
import { workers } from "./worker";

export const notifications = pgTable(
  "notifications",
  {
    body: text("body").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id").references(() => customers.id),
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id),
    readAt: timestamp("read_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    status: notificationStatusEnum("status").notNull().default("queued"),
    subject: text("subject"),
    workerId: integer("worker_id").references(() => workers.id),
  },
  (table) => [
    index("idx_notifications_customer_id").on(table.customerId),
    index("idx_notifications_order_id").on(table.orderId),
    index("idx_notifications_status_schedule").on(
      table.status,
      table.scheduledAt
    ),
  ]
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    attemptedAt: timestamp("attempted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    errorMessage: text("error_message"),
    id: serial("id").primaryKey(),
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    providerMessageId: text("provider_message_id"),
    status: notificationStatusEnum("status").notNull().default("queued"),
  },
  (table) => [
    index("idx_notification_deliveries_notification_id").on(
      table.notificationId
    ),
  ]
);
