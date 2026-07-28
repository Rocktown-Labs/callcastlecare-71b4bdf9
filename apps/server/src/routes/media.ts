import { db, eq } from "@callcastlecare/db";
import {
  legMediaLinks,
  mediaAssets,
  orderMediaLinks,
  orders,
  serviceLegs,
} from "@callcastlecare/db/schema/index";
import { env } from "@callcastlecare/env/server";
import { Hono } from "hono";

import { requireUser, requireWorkerForUser } from "../lib/auth";
import {
  createMediaStoragePath,
  getMediaUploadUrl,
  handleBlobClientUpload,
} from "../lib/integrations/blob";
import type { AppEnv } from "../types";
import {
  mediaAttachRequestSchema,
  mediaUploadUrlRequestSchema,
} from "./schemas";

const extensionFromContentType = (contentType: string) => {
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  if (contentType.includes("heic")) {
    return "heic";
  }
  return "jpg";
};

export const mediaRoutes = new Hono<AppEnv>()
  .post("/upload-url", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    if (!env.VERCEL_BLOB_READ_WRITE_TOKEN) {
      return c.json({ error: "Blob upload is not configured" }, 503);
    }

    const body = await c.req.json();
    const parsed = mediaUploadUrlRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const extension = extensionFromContentType(parsed.data.contentType);
    const storagePath = createMediaStoragePath({
      extension,
      legId: parsed.data.legId,
      mediaType: parsed.data.mediaType,
      orderId: parsed.data.orderId,
    });

    const origin = new URL(c.req.url).origin || env.BETTER_AUTH_URL;

    return c.json(
      {
        storagePath,
        uploadUrl: getMediaUploadUrl(origin),
      },
      200
    );
  })
  .post("/client-upload", async (c) => {
    const body = await c.req.json();
    const result = await handleBlobClientUpload(c.req.raw, body);
    return c.json(result, 200);
  })
  .post("/attach", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const body = await c.req.json();
    const parsed = mediaAttachRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const worker = await requireWorkerForUser(userResult.user);

    if (!parsed.data.orderId && !parsed.data.legId) {
      return c.json({ error: "Either orderId or legId is required" }, 400);
    }

    if (parsed.data.orderId) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, parsed.data.orderId),
      });
      if (!order) {
        return c.json({ error: "Order not found" }, 404);
      }
    }

    if (parsed.data.legId) {
      const leg = await db.query.serviceLegs.findFirst({
        where: eq(serviceLegs.id, parsed.data.legId),
      });
      if (!leg) {
        return c.json({ error: "Leg not found" }, 404);
      }
    }

    const insertedAssets = await db
      .insert(mediaAssets)
      .values({
        mediaType: parsed.data.mediaType,
        metadataJson: parsed.data.metadata ?? {},
        storagePath: parsed.data.storagePath,
        uploadedByWorkerId: worker?.id,
      })
      .returning();

    const asset = insertedAssets[0];
    if (!asset) {
      return c.json({ error: "Failed to register uploaded media" }, 500);
    }

    if (parsed.data.orderId) {
      await db.insert(orderMediaLinks).values({
        mediaAssetId: asset.id,
        orderId: parsed.data.orderId,
        requiredForTransition:
          parsed.data.requiredForTransition === "arrived" ||
          parsed.data.requiredForTransition === "in_progress" ||
          parsed.data.requiredForTransition === "completed"
            ? (parsed.data.requiredForTransition as
                | "arrived"
                | "in_progress"
                | "completed")
            : null,
      });
    }

    if (parsed.data.legId) {
      await db.insert(legMediaLinks).values({
        legId: parsed.data.legId,
        mediaAssetId: asset.id,
        requiredForTransition:
          parsed.data.requiredForTransition === "arrived" ||
          parsed.data.requiredForTransition === "started" ||
          parsed.data.requiredForTransition === "stopped" ||
          parsed.data.requiredForTransition === "completed"
            ? (parsed.data.requiredForTransition as
                | "arrived"
                | "started"
                | "stopped"
                | "completed")
            : null,
      });
    }

    return c.json(
      {
        mediaAssetId: asset.id,
        ok: true,
      },
      200
    );
  });
