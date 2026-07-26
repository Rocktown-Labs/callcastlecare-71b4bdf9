import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { legStatusEnum, mediaTypeEnum, orderStatusEnum } from "./enums";
import { serviceLegs } from "./laundry";
import { orders } from "./order";
import { workers } from "./worker";

export const mediaAssets = pgTable(
  "media_assets",
  {
    checksum: text("checksum"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    mediaType: mediaTypeEnum("media_type").notNull(),
    metadataJson: jsonb("metadata_json"),
    storagePath: text("storage_path").notNull(),
    uploadedByWorkerId: integer("uploaded_by_worker_id").references(
      () => workers.id
    ),
  },
  (table) => [index("idx_media_assets_type").on(table.mediaType)]
);

export const orderMediaLinks = pgTable(
  "order_media_links",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    mediaAssetId: integer("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    requiredForTransition: orderStatusEnum("required_for_transition"),
  },
  (table) => [
    index("idx_order_media_links_order_id").on(table.orderId),
    uniqueIndex("idx_order_media_links_unique").on(
      table.orderId,
      table.mediaAssetId
    ),
  ]
);

export const legMediaLinks = pgTable(
  "leg_media_links",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: serial("id").primaryKey(),
    legId: integer("leg_id")
      .notNull()
      .references(() => serviceLegs.id, { onDelete: "cascade" }),
    mediaAssetId: integer("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    requiredForTransition: legStatusEnum("required_for_transition"),
  },
  (table) => [
    index("idx_leg_media_links_leg_id").on(table.legId),
    uniqueIndex("idx_leg_media_links_unique").on(
      table.legId,
      table.mediaAssetId
    ),
  ]
);
