import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { checkoutItems } from "./checkout";
import { orders } from "./order";

export const windowWashingDetails = pgTable("window_washing_details", {
  checkoutItemId: integer("checkout_item_id").references(
    () => checkoutItems.id,
    {
      onDelete: "cascade",
    }
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  estimatedWindows: integer("estimated_windows").notNull(),
  hasScreenCleaning: boolean("has_screen_cleaning").notNull().default(false),
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, {
    onDelete: "cascade",
  }),
  servicePackage: text("service_package").notNull(),
  storyCount: integer("story_count").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
