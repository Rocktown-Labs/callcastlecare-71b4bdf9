import { boolean, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const checkoutSettings = pgTable("checkout_settings", {
  allowCashCheckout: boolean("allow_cash_checkout").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: serial("id").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
