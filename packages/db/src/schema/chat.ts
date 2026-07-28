import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { orders } from "./order";

export const conversations = pgTable(
  "conversations",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id, {
      onDelete: "cascade",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_conversations_order_id").on(table.orderId)]
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    role: text("role").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_conversation_participants_unique").on(
      table.conversationId,
      table.userId
    ),
    index("idx_conversation_participants_user_id").on(table.userId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    body: text("body").notNull(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_messages_conversation_created").on(
      table.conversationId,
      table.createdAt
    ),
  ]
);

export const messageReads = pgTable(
  "message_reads",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_message_reads_unique").on(table.messageId, table.userId),
    index("idx_message_reads_user_id").on(table.userId),
  ]
);
