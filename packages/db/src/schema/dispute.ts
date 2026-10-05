import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { orders } from "./order";

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "resolved_customer",
  "resolved_provider",
  "dismissed",
]);

export const orderDisputes = pgTable(
  "order_disputes",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerNote: text("customer_note"),
    evidenceJson: jsonb("evidence_json"),
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id),
    status: disputeStatusEnum("status").notNull().default("open"),
    stripeDisputeId: text("stripe_dispute_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_order_disputes_order_id").on(table.orderId),
    index("idx_order_disputes_status").on(table.status, table.createdAt),
    uniqueIndex("idx_order_disputes_stripe_id").on(table.stripeDisputeId),
  ]
);
