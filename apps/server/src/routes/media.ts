import { db, eq, inArray } from "@callcastlecare/db";
import {
  customers,
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
  getPrivateBlob,
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

const orderTransitionMediaStatuses = [
  "arrived",
  "in_progress",
  "completed",
] as const;

const legTransitionMediaStatuses = [
  "arrived",
  "started",
  "stopped",
  "completed",
] as const;

const toOrderRequiredTransition = (value?: string) =>
  orderTransitionMediaStatuses.find((status) => status === value) ?? null;

const toLegRequiredTransition = (value?: string) =>
  legTransitionMediaStatuses.find((status) => status === value) ?? null;

const canReadPrivateMedia = async (input: {
  pathname: string;
  user: NonNullable<ReturnType<typeof requireUser>["user"]>;
}) => {
  const isAdmin =
    input.user.role === "admin" ||
    input.user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

  const asset = await db.query.mediaAssets.findFirst({
    where: eq(mediaAssets.storagePath, input.pathname),
  });

  if (!asset) {
    return { allowed: false, found: false };
  }

  if (isAdmin) {
    return { allowed: true, found: true };
  }

  const [customer, worker, orderLinks, legLinks] = await Promise.all([
    db.query.customers.findFirst({
      where: eq(customers.userId, input.user.id),
    }),
    requireWorkerForUser(input.user),
    db.query.orderMediaLinks.findMany({
      where: eq(orderMediaLinks.mediaAssetId, asset.id),
    }),
    db.query.legMediaLinks.findMany({
      where: eq(legMediaLinks.mediaAssetId, asset.id),
    }),
  ]);

  const linkedLegIds = legLinks.map((link) => link.legId);
  const linkedLegs =
    linkedLegIds.length === 0
      ? []
      : await db.query.serviceLegs.findMany({
          where: inArray(serviceLegs.id, linkedLegIds),
        });
  const linkedOrderIds = new Set([
    ...orderLinks.map((link) => link.orderId),
    ...linkedLegs.map((leg) => leg.orderId),
  ]);

  if (linkedOrderIds.size === 0) {
    return { allowed: false, found: true };
  }

  const linkedOrders = await db.query.orders.findMany({
    where: inArray(orders.id, [...linkedOrderIds]),
  });
  const canReadAsCustomer =
    customer && linkedOrders.some((order) => order.customerId === customer.id);
  const canReadAsWorker =
    worker &&
    (linkedOrders.some((order) => order.assignedWorkerId === worker.id) ||
      linkedLegs.some((leg) => leg.workerId === worker.id));

  return {
    allowed: Boolean(canReadAsCustomer || canReadAsWorker),
    found: true,
  };
};

export const mediaRoutes = new Hono<AppEnv>()
  .get("/private", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const pathname = c.req.query("pathname");
    if (!pathname) {
      return c.json({ error: "Missing pathname" }, 400);
    }

    const access = await canReadPrivateMedia({
      pathname,
      user: userResult.user,
    });
    if (!access.found) {
      return c.text("Not found", 404);
    }
    if (!access.allowed) {
      return c.json({ error: "forbidden" }, 403);
    }

    const result = await getPrivateBlob(pathname);
    if (!result) {
      return c.text("Not found", 404);
    }

    if (result.statusCode === 304) {
      return c.body(null, 304);
    }

    return c.body(result.stream, 200, {
      "Cache-Control": "private, no-cache",
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
    });
  })
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
        access: "private",
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

    const [asset] = insertedAssets;
    if (!asset) {
      return c.json({ error: "Failed to register uploaded media" }, 500);
    }

    if (parsed.data.orderId) {
      await db.insert(orderMediaLinks).values({
        mediaAssetId: asset.id,
        orderId: parsed.data.orderId,
        requiredForTransition: toOrderRequiredTransition(
          parsed.data.requiredForTransition
        ),
      });
    }

    if (parsed.data.legId) {
      await db.insert(legMediaLinks).values({
        legId: parsed.data.legId,
        mediaAssetId: asset.id,
        requiredForTransition: toLegRequiredTransition(
          parsed.data.requiredForTransition
        ),
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
