import {
  defaultStripeCatalogItems,
  defaultStripeCoupons,
  stripeCatalogSyncRequestSchema,
} from "@callcastlecare/api";
import { and, db, desc, eq, inArray } from "@callcastlecare/db";
import {
  addresses,
  customers,
  mediaAssets,
  orderItems,
  orderMediaLinks,
  orders,
  orderStatusHistory,
  notifications,
  stripeCatalogItems,
  stripeCoupons,
  stripeSyncRuns,
  supportRequests,
  workers,
} from "@callcastlecare/db/schema/index";
import { env } from "@callcastlecare/env/server";
import type { Context } from "hono";
import { Hono } from "hono";

import {
  createStripeClientOrThrow,
  ensureStripeWebhookEndpoint,
  syncStripeCatalogItem,
  syncStripeCoupon,
} from "../lib/integrations/stripe-catalog";
import { logger } from "../lib/logger";
import { setOrderStatus } from "../lib/orders";
import type { AppEnv } from "../types";
import {
  adminOrderActionRequestSchema,
  adminOrderNoteRequestSchema,
} from "./schemas";

type OrderStatus =
  | "draft"
  | "quoted"
  | "pending_payment"
  | "paid"
  | "dispatching"
  | "assigned"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed";

const parsePositiveId = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const requireAdmin = (c: Context<AppEnv>) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const isAdminEmail = user.email.toLowerCase() === adminEmail;
  const isAdminRole = user.role === "admin";

  if (!(isAdminEmail || isAdminRole)) {
    return c.json({ error: "forbidden" }, 403);
  }

  return null;
};

const normalizeCatalogRow = (row: typeof stripeCatalogItems.$inferSelect) => ({
  active: row.active,
  amountCents: row.amountCents,
  currency: row.currency,
  description: row.description,
  interval: row.interval ?? "one_time",
  name: row.name,
  serviceType: row.serviceType,
  slug: row.slug,
  stripePriceId: row.stripePriceId,
  stripeProductId: row.stripeProductId,
});

const normalizeCouponRow = (row: typeof stripeCoupons.$inferSelect) => ({
  active: row.active,
  amountOffCents: row.amountOffCents,
  code: row.code,
  currency: row.currency,
  duration: row.duration,
  durationInMonths: row.durationInMonths,
  name: row.name,
  percentOff: row.percentOff,
  stripeCouponId: row.stripeCouponId,
});

const activeOrderStatuses = [
  "pending_payment",
  "paid",
  "dispatching",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
] as const;

const serviceLabels = {
  laundry: "Laundry",
  lawncare: "Lawn Care",
  window_washing: "Window Washing",
} as const;

const statusLabels = {
  arrived: "Arrived",
  assigned: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  dispatching: "Ready to dispatch",
  draft: "Draft",
  en_route: "On the way",
  failed: "Failed",
  in_progress: "In progress",
  paid: "Paid",
  pending_payment: "Awaiting payment",
  quoted: "Quoted",
} as const satisfies Record<OrderStatus, string>;

const orderStatusTimestampPatch = (
  status: "arrived" | "in_progress" | "completed"
) => {
  if (status === "arrived") {
    return { arrivedAt: new Date() };
  }
  if (status === "in_progress") {
    return { startedAt: new Date() };
  }
  return { completedAt: new Date() };
};

const getOrderMediaTypes = async (orderId: number) => {
  const links = await db.query.orderMediaLinks.findMany({
    where: eq(orderMediaLinks.orderId, orderId),
  });
  const mediaIds = links.map((link) => link.mediaAssetId);
  if (mediaIds.length === 0) {
    return new Set<string>();
  }

  const assets = await db.query.mediaAssets.findMany({
    columns: {
      mediaType: true,
    },
    where: inArray(mediaAssets.id, mediaIds),
  });

  return new Set(assets.map((asset) => asset.mediaType));
};

const hasBeforeMedia = (mediaTypes: Set<string>) =>
  mediaTypes.has("service_before") || mediaTypes.has("lawncare_before");

const hasAfterMedia = (mediaTypes: Set<string>) =>
  mediaTypes.has("service_after") || mediaTypes.has("lawncare_after");

const getAdminOrderDetail = async (orderId: number) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return null;
  }

  const [customer, address, items, statusHistory, mediaLinks] =
    await Promise.all([
      db.query.customers.findFirst({
        where: eq(customers.id, order.customerId),
      }),
      db.query.addresses.findFirst({
        where: eq(addresses.id, order.addressId),
      }),
      db.query.orderItems.findMany({
        orderBy: (table, { asc }) => [asc(table.id)],
        where: eq(orderItems.orderId, order.id),
      }),
      db.query.orderStatusHistory.findMany({
        orderBy: desc(orderStatusHistory.changedAt),
        where: eq(orderStatusHistory.orderId, order.id),
      }),
      db.query.orderMediaLinks.findMany({
        orderBy: desc(orderMediaLinks.createdAt),
        where: eq(orderMediaLinks.orderId, order.id),
      }),
    ]);

  const mediaIds = mediaLinks.map((link) => link.mediaAssetId);
  const media =
    mediaIds.length === 0
      ? []
      : await db.query.mediaAssets.findMany({
          where: inArray(mediaAssets.id, mediaIds),
        });
  const mediaById = new Map(media.map((asset) => [asset.id, asset]));

  return {
    address,
    customer,
    items,
    media: mediaLinks.map((link) => ({
      ...link,
      asset: mediaById.get(link.mediaAssetId) ?? null,
    })),
    order,
    statusHistory,
  };
};

const getNextStatusForAdminAction = (action: string): OrderStatus => {
  if (action === "confirm") {
    return "assigned";
  }
  if (action === "arrived") {
    return "arrived";
  }
  if (action === "start") {
    return "in_progress";
  }
  if (action === "complete") {
    return "completed";
  }
  if (action === "cancel") {
    return "cancelled";
  }
  return "failed";
};

const allowedAdminActionStatuses = {
  arrived: ["assigned", "dispatching", "en_route"],
  cancel: [
    "pending_payment",
    "paid",
    "dispatching",
    "assigned",
    "en_route",
    "arrived",
    "in_progress",
  ],
  complete: ["arrived", "in_progress", "en_route"],
  confirm: ["pending_payment", "paid", "dispatching"],
  fail: [
    "pending_payment",
    "paid",
    "dispatching",
    "assigned",
    "en_route",
    "arrived",
    "in_progress",
  ],
  start: ["arrived"],
} as const satisfies Record<string, readonly OrderStatus[]>;

const getAdminActionNote = (action: string, note?: string) =>
  note?.trim() ||
  {
    arrived: "Admin marked arrival in the field",
    cancel: "Admin cancelled order",
    complete: "Admin completed service",
    confirm: "Admin confirmed order",
    fail: "Admin marked order failed",
    start: "Admin started service",
  }[action] ||
  "Admin updated order";

const seedCatalogIfEmpty = async () => {
  const [existingItems, existingCoupons] = await Promise.all([
    db.query.stripeCatalogItems.findMany(),
    db.query.stripeCoupons.findMany(),
  ]);

  const itemBySlug = new Map(existingItems.map((item) => [item.slug, item]));
  const couponByCode = new Map(
    existingCoupons.map((coupon) => [coupon.code, coupon])
  );

  await Promise.all(
    defaultStripeCatalogItems.map((item) => {
      const existing = itemBySlug.get(item.slug);
      const metadata = existing?.metadataJson as
        | { source?: string }
        | null
        | undefined;
      const shouldRefresh = !existing || metadata?.source === "default";

      if (!shouldRefresh) {
        return null;
      }

      return db
        .insert(stripeCatalogItems)
        .values({
          active: item.active,
          amountCents: item.amountCents,
          currency: item.currency,
          description: item.description,
          interval: item.interval,
          metadataJson: {
            source: "default",
          },
          name: item.name,
          serviceType: item.serviceType,
          slug: item.slug,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          set: {
            active: item.active,
            amountCents: item.amountCents,
            currency: item.currency,
            description: item.description,
            interval: item.interval,
            metadataJson: {
              source: "default",
            },
            name: item.name,
            serviceType: item.serviceType,
            updatedAt: new Date(),
          },
          target: stripeCatalogItems.slug,
        });
    })
  );

  await Promise.all(
    defaultStripeCoupons.map((coupon) => {
      const existing = couponByCode.get(coupon.code);
      const metadata = existing?.metadataJson as
        | { source?: string }
        | null
        | undefined;
      const shouldRefresh = !existing || metadata?.source === "default";

      if (!shouldRefresh) {
        return null;
      }

      return db
        .insert(stripeCoupons)
        .values({
          active: coupon.active,
          amountOffCents: coupon.amountOffCents,
          code: coupon.code,
          currency: coupon.currency,
          duration: coupon.duration,
          durationInMonths: coupon.durationInMonths,
          metadataJson: {
            source: "default",
          },
          name: coupon.name,
          percentOff: coupon.percentOff,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          set: {
            active: coupon.active,
            amountOffCents: coupon.amountOffCents,
            currency: coupon.currency,
            duration: coupon.duration,
            durationInMonths: coupon.durationInMonths,
            metadataJson: {
              source: "default",
            },
            name: coupon.name,
            percentOff: coupon.percentOff,
            updatedAt: new Date(),
          },
          target: stripeCoupons.code,
        });
    })
  );
};

export const adminRoutes = new Hono<AppEnv>()
  .get("/summary", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const [orderRows, supportRows, workerRows, notificationRows] =
      await Promise.all([
        db.query.orders.findMany({
          columns: {
            id: true,
            status: true,
          },
          limit: 100,
          orderBy: desc(orders.createdAt),
        }),
        db.query.supportRequests
          .findMany({
            columns: {
              id: true,
              status: true,
            },
            limit: 100,
            orderBy: desc(supportRequests.createdAt),
          })
          .catch(() => []),
        db.query.workers.findMany({
          columns: {
            id: true,
            onboardingStatus: true,
          },
          limit: 100,
          orderBy: desc(workers.createdAt),
        }),
        db.query.notifications.findMany({
          columns: {
            id: true,
            readAt: true,
          },
          limit: 100,
          orderBy: desc(notifications.createdAt),
        }),
      ]);

    return c.json(
      {
        activeOrders: orderRows.filter((order) =>
          activeOrderStatuses.includes(
            order.status as (typeof activeOrderStatuses)[number]
          )
        ).length,
        openSupport: supportRows.filter(
          (request) => request.status !== "closed"
        ).length,
        pendingWorkers: workerRows.filter(
          (worker) => worker.onboardingStatus === "pending"
        ).length,
        unreadNotifications: notificationRows.filter(
          (notification) => !notification.readAt
        ).length,
      },
      200
    );
  })
  .get("/orders", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const rows = await db
      .select({
        address: addresses,
        customer: customers,
        order: orders,
      })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(addresses, eq(addresses.id, orders.addressId))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    return c.json(
      {
        orders: rows.map((row) => ({
          address: row.address,
          customer: row.customer,
          order: {
            ...row.order,
            serviceLabel:
              serviceLabels[
                row.order.serviceType as keyof typeof serviceLabels
              ] ?? row.order.serviceType,
            statusLabel:
              statusLabels[row.order.status as OrderStatus] ?? row.order.status,
          },
        })),
      },
      200
    );
  })
  .get("/workers", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const list = await db.query.workers.findMany({
      limit: 100,
      orderBy: desc(workers.createdAt),
    });

    return c.json({ workers: list }, 200);
  })
  .get("/orders/:orderId", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const orderId = parsePositiveId(c.req.param("orderId"));
    if (!orderId) {
      return c.json({ error: "Invalid order id" }, 400);
    }

    const detail = await getAdminOrderDetail(orderId);
    if (!detail) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json({ detail }, 200);
  })
  .post("/orders/:orderId/notes", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const orderId = parsePositiveId(c.req.param("orderId"));
    if (!orderId) {
      return c.json({ error: "Invalid order id" }, 400);
    }

    const body = await c.req.json();
    const parsed = adminOrderNoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    const user = c.get("user");
    await db.insert(orderStatusHistory).values({
      fromStatus: order.status,
      note: parsed.data.note,
      orderId: order.id,
      toStatus: order.status,
      triggeredByUserId: user?.id,
    });

    return c.json({ ok: true }, 200);
  })
  .post("/orders/:orderId/actions", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const orderId = parsePositiveId(c.req.param("orderId"));
    if (!orderId) {
      return c.json({ error: "Invalid order id" }, 400);
    }

    const body = await c.req.json();
    const parsed = adminOrderActionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    const allowedStatuses = allowedAdminActionStatuses[
      parsed.data.action
    ] as readonly OrderStatus[];
    if (!allowedStatuses.includes(order.status as OrderStatus)) {
      return c.json(
        {
          error: `${parsed.data.action} cannot run while order is ${order.status}`,
        },
        409
      );
    }

    if (parsed.data.action === "start" || parsed.data.action === "complete") {
      const mediaTypes = await getOrderMediaTypes(order.id);
      if (parsed.data.action === "start" && !hasBeforeMedia(mediaTypes)) {
        return c.json({ error: "Before photo is required" }, 409);
      }
      if (parsed.data.action === "complete" && !hasAfterMedia(mediaTypes)) {
        return c.json({ error: "After photo is required" }, 409);
      }
    }

    const nextStatus = getNextStatusForAdminAction(parsed.data.action);
    const user = c.get("user");
    await setOrderStatus({
      note: getAdminActionNote(parsed.data.action, parsed.data.note),
      orderId: order.id,
      toStatus: nextStatus,
      triggeredByUserId: user?.id,
    });

    if (
      nextStatus === "arrived" ||
      nextStatus === "in_progress" ||
      nextStatus === "completed"
    ) {
      await db
        .update(orders)
        .set({
          ...orderStatusTimestampPatch(nextStatus),
        })
        .where(eq(orders.id, order.id));
    }

    if (parsed.data.action === "confirm") {
      await db
        .update(orders)
        .set({
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    return c.json({ ok: true }, 200);
  })
  .get("/support", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const requests = await db.query.supportRequests
      .findMany({
        limit: 50,
        orderBy: desc(supportRequests.createdAt),
      })
      .catch(() => []);

    return c.json({ requests }, 200);
  })
  .get("/stripe/catalog", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    await seedCatalogIfEmpty();

    const [items, coupons, syncRuns] = await Promise.all([
      db.query.stripeCatalogItems.findMany({
        orderBy: (table, { asc }) => [asc(table.serviceType), asc(table.slug)],
      }),
      db.query.stripeCoupons.findMany({
        orderBy: (table, { asc }) => [asc(table.code)],
      }),
      db
        .select()
        .from(stripeSyncRuns)
        .orderBy(desc(stripeSyncRuns.createdAt))
        .limit(5),
    ]);

    return c.json(
      {
        adminEmail: env.ADMIN_EMAIL,
        coupons: coupons.map(normalizeCouponRow),
        items: items.map(normalizeCatalogRow),
        lastSync: syncRuns[0] ?? null,
        syncRuns,
      },
      200
    );
  })
  .put("/stripe/catalog", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const body = await c.req.json();
    const parsed = stripeCatalogSyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    await Promise.all(
      parsed.data.items.map((item) =>
        db
          .insert(stripeCatalogItems)
          .values({
            active: item.active,
            amountCents: item.amountCents,
            currency: item.currency,
            description: item.description,
            interval: item.interval,
            metadataJson: {
              source: "admin",
            },
            name: item.name,
            serviceType: item.serviceType,
            slug: item.slug,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            set: {
              active: item.active,
              amountCents: item.amountCents,
              currency: item.currency,
              description: item.description,
              interval: item.interval,
              name: item.name,
              serviceType: item.serviceType,
              updatedAt: new Date(),
            },
            target: stripeCatalogItems.slug,
          })
      )
    );

    await Promise.all(
      parsed.data.coupons.map((coupon) =>
        db
          .insert(stripeCoupons)
          .values({
            active: coupon.active,
            amountOffCents: coupon.amountOffCents,
            code: coupon.code,
            currency: coupon.currency,
            duration: coupon.duration,
            durationInMonths: coupon.durationInMonths,
            metadataJson: {
              source: "admin",
            },
            name: coupon.name,
            percentOff: coupon.percentOff,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            set: {
              active: coupon.active,
              amountOffCents: coupon.amountOffCents,
              currency: coupon.currency,
              duration: coupon.duration,
              durationInMonths: coupon.durationInMonths,
              name: coupon.name,
              percentOff: coupon.percentOff,
              updatedAt: new Date(),
            },
            target: stripeCoupons.code,
          })
      )
    );

    return c.json({ ok: true }, 200);
  })
  .post("/stripe/sync", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    await seedCatalogIfEmpty();

    const items = await db.query.stripeCatalogItems.findMany({
      where: eq(stripeCatalogItems.active, true),
    });
    const coupons = await db.query.stripeCoupons.findMany({
      where: eq(stripeCoupons.active, true),
    });

    try {
      const stripe = createStripeClientOrThrow();
      const syncedItems: {
        slug: string;
        stripePriceId: string;
        stripeProductId: string;
      }[] = [];

      for (const row of items) {
        // eslint-disable-next-line no-await-in-loop -- Stripe catalog writes run sequentially to avoid dashboard-triggered rate limits.
        const synced = await syncStripeCatalogItem(stripe, {
          active: row.active,
          amountCents: row.amountCents,
          currency: row.currency,
          description: row.description,
          interval: row.interval as "month" | "one_time" | "week" | "year",
          name: row.name,
          serviceType: row.serviceType as
            | "combo"
            | "fee"
            | "laundry"
            | "lawncare"
            | "window_washing",
          slug: row.slug,
        });

        // eslint-disable-next-line no-await-in-loop -- Keep local Stripe ids in step with each sequential Stripe write.
        await db
          .update(stripeCatalogItems)
          .set({
            stripePriceId: synced.stripePriceId,
            stripeProductId: synced.stripeProductId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(stripeCatalogItems.slug, row.slug),
              eq(stripeCatalogItems.id, row.id)
            )
          );
        syncedItems.push({ slug: row.slug, ...synced });
      }

      const syncedCoupons: {
        code: string;
        stripeCouponId: string;
      }[] = [];

      for (const row of coupons) {
        // eslint-disable-next-line no-await-in-loop -- Stripe coupon writes run sequentially to avoid dashboard-triggered rate limits.
        const synced = await syncStripeCoupon(stripe, {
          active: row.active,
          amountOffCents: row.amountOffCents,
          code: row.code,
          currency: row.currency,
          duration:
            row.duration === "forever" || row.duration === "repeating"
              ? row.duration
              : "once",
          durationInMonths: row.durationInMonths,
          name: row.name,
          percentOff: row.percentOff,
        });

        // eslint-disable-next-line no-await-in-loop -- Keep local Stripe ids in step with each sequential Stripe write.
        await db
          .update(stripeCoupons)
          .set({
            stripeCouponId: synced.stripeCouponId,
            updatedAt: new Date(),
          })
          .where(
            and(eq(stripeCoupons.code, row.code), eq(stripeCoupons.id, row.id))
          );
        syncedCoupons.push({ code: row.code, ...synced });
      }

      const webhookEndpointId = await ensureStripeWebhookEndpoint(stripe);

      const syncRunRows = await db
        .insert(stripeSyncRuns)
        .values({
          catalogItemCount: syncedItems.length,
          couponCount: syncedCoupons.length,
          metadataJson: {
            coupons: syncedCoupons,
            items: syncedItems,
          },
          status: "success",
          stripeWebhookEndpointId: webhookEndpointId,
        })
        .returning();

      return c.json(
        {
          coupons: syncedCoupons,
          items: syncedItems,
          syncRun: syncRunRows[0],
          webhookEndpointId,
        },
        200
      );
    } catch (error) {
      logger.error({ error }, "stripe_catalog:sync_failed");
      const message =
        error instanceof Error ? error.message : "Stripe sync failed";

      await db.insert(stripeSyncRuns).values({
        catalogItemCount: items.length,
        couponCount: coupons.length,
        errorMessage: message,
        status: "failed",
      });

      return c.json({ error: message }, 500);
    }
  });
