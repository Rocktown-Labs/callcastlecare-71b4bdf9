import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { addresses, customers } from "./customer";
import { quoteStatusEnum, serviceTypeEnum } from "./enums";

export const quotes = pgTable(
  "quotes",
  {
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: serial("id").primaryKey(),
    inputJson: jsonb("input_json"),
    serviceType: serviceTypeEnum("service_type").notNull(),
    status: quoteStatusEnum("status").notNull().default("pending"),
    totalPriceCents: integer("total_price_cents"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_quotes_customer_status").on(table.customerId, table.status),
    index("idx_quotes_service_type").on(table.serviceType),
  ]
);

export const quoteLineItems = pgTable(
  "quote_line_items",
  {
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    quoteId: integer("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_quote_line_items_quote_id").on(table.quoteId)]
);

export const quoteProviderRequests = pgTable(
  "quote_provider_requests",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    providerName: text("provider_name").notNull(),
    quoteId: integer("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    requestBodyJson: jsonb("request_body_json"),
    requestId: text("request_id").notNull(),
  },
  (table) => [
    uniqueIndex("idx_quote_provider_request_id").on(
      table.providerName,
      table.requestId
    ),
    index("idx_quote_provider_requests_quote_id").on(table.quoteId),
  ]
);

export const quoteProviderResults = pgTable(
  "quote_provider_results",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    providerRequestId: integer("provider_request_id")
      .notNull()
      .references(() => quoteProviderRequests.id, { onDelete: "cascade" }),
    responseBodyJson: jsonb("response_body_json"),
    success: boolean("success").notNull().default(true),
  },
  (table) => [
    index("idx_quote_provider_results_request_id").on(table.providerRequestId),
  ]
);
