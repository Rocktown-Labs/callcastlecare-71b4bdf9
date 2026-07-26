import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { outboxStatusEnum } from "./enums";

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    requestHash: text("request_hash"),
    responseJson: jsonb("response_json"),
    scope: text("scope").notNull(),
  },
  (table) => [
    uniqueIndex("idx_idempotency_scope_key").on(table.scope, table.key),
  ]
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventKey: text("event_key").notNull(),
    eventName: text("event_name").notNull(),
    id: serial("id").primaryKey(),
    payloadJson: jsonb("payload_json").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    status: outboxStatusEnum("status").notNull().default("pending"),
  },
  (table) => [
    uniqueIndex("idx_outbox_event_key_unique").on(table.eventKey),
    index("idx_outbox_status_created").on(table.status, table.createdAt),
  ]
);
