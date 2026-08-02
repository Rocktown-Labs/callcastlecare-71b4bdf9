import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const marketModeEnum = pgEnum("market_mode", [
  "on_demand",
  "subscription_first",
  "paused",
]);

export const markets = pgTable(
  "markets",
  {
    activeProCount: integer("active_pro_count").notNull().default(0),
    autoOnDemandAtPros: integer("auto_on_demand_at_pros").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    label: text("label").notNull(),
    longDistanceEnabled: boolean("long_distance_enabled")
      .notNull()
      .default(true),
    mode: marketModeEnum("mode").notNull().default("subscription_first"),
    notes: text("notes"),
    stateCode: text("state_code").notNull(),
    travelFeesEnabled: boolean("travel_fees_enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_markets_state_code").on(table.stateCode),
    index("idx_markets_mode").on(table.mode, table.isActive),
  ]
);
