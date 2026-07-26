import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { geographyPoint } from "./geo";

export const customers = pgTable(
  "customers",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    id: serial("id").primaryKey(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_customers_email").on(sql`lower(${table.email})`),
    index("idx_customers_phone").on(table.phone),
    uniqueIndex("idx_customers_user_id").on(table.userId),
  ]
);

export const addresses = pgTable(
  "addresses",
  {
    city: text("city").notNull(),
    country: text("country").notNull().default("US"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    formattedAddress: text("formatted_address"),
    id: serial("id").primaryKey(),
    instructions: text("instructions"),
    isDefault: boolean("is_default").notNull().default(false),
    isValidated: boolean("is_validated").notNull().default(false),
    label: text("label").notNull().default("Address"),
    latitude: numeric("latitude", { mode: "number", precision: 10, scale: 8 }),
    location: geographyPoint("location"),
    longitude: numeric("longitude", {
      mode: "number",
      precision: 11,
      scale: 8,
    }),
    radarGeocodeJson: jsonb("radar_geocode_json"),
    state: text("state").notNull(),
    street: text("street").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    zip: text("zip").notNull(),
  },
  (table) => [
    index("idx_addresses_customer_id").on(table.customerId),
    uniqueIndex("idx_addresses_customer_default_unique")
      .on(table.customerId)
      .where(sql`${table.isDefault} = true`),
    index("idx_addresses_location").on(table.latitude, table.longitude),
  ]
);

export const properties = pgTable(
  "properties",
  {
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    homeSqft: integer("home_sqft"),
    id: serial("id").primaryKey(),
    lotSizeSqft: integer("lot_size_sqft"),
    source: text("source").notNull().default("zillow"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    zillowDataJson: jsonb("zillow_data_json"),
  },
  (table) => [uniqueIndex("idx_properties_address_id").on(table.addressId)]
);
