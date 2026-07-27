import { db, and, desc, eq, inArray } from "@callcastlecare/db";
import {
  addresses,
  dispatchOffers,
  legMediaLinks,
  orderMediaLinks,
  orderTrackingPoints,
  orderStatusHistory,
  orders,
  serviceLegs,
} from "@callcastlecare/db/schema/index";
import { Hono } from "hono";

import { getOrCreateCustomerForUser, requireUser } from "../lib/auth";
import { setOrderStatus } from "../lib/orders";
import { publishOutboxEvent } from "../lib/outbox";
import type { AppEnv } from "../types";

const parseOrderId = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const STATUS_LABELS = {
  arrived: "Arrived",
  assigned: "Provider assigned",
  cancelled: "Cancelled",
  completed: "Completed",
  dispatching: "Finding provider",
  en_route: "On the way",
  failed: "Failed",
  in_progress: "In progress",
  paid: "Paid",
  pending_payment: "Awaiting payment",
} as const;

const ACTIVE_TRACKING_STATUSES = new Set([
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
] as const);

const mapOrderStatusToPhase = (status: string) => {
  if (status === "pending_payment") {
    return "awaiting_payment";
  }
  if (status === "paid" || status === "dispatching" || status === "assigned") {
    return "finding_provider";
  }
  if (status === "en_route") {
    return "on_the_way";
  }
  if (status === "arrived") {
    return "arrived";
  }
  if (status === "in_progress") {
    return "in_progress";
  }
  if (status === "completed") {
    return "completed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  if (status === "failed") {
    return "failed";
  }

  return "finding_provider";
};

const toIso = (value: Date | null | undefined) =>
  value ? value.toISOString() : new Date(0).toISOString();

const toCustomerTimeline = (
  order: {
    createdAt: Date;
    status: string;
    updatedAt: Date;
  },
  history: {
    changedAt: Date;
    note: string | null;
    toStatus: string;
  }[]
) => {
  // eslint-disable-next-line unicorn/no-array-sort -- ES2022 target does not include Array.prototype.toSorted.
  const sortedHistory = [...history].sort(
    (first, second) => first.changedAt.getTime() - second.changedAt.getTime()
  );

  const entries = sortedHistory.map((entry) => ({
    at: entry.changedAt.toISOString(),
    key: entry.toStatus,
    label:
      STATUS_LABELS[entry.toStatus as keyof typeof STATUS_LABELS] ??
      entry.toStatus,
    note: entry.note,
  }));

  const latest = entries.at(-1);
  if (!latest || latest.key !== order.status) {
    entries.push({
      at: toIso(order.updatedAt ?? order.createdAt),
      key: order.status,
      label:
        STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ??
        order.status,
      note: null,
    });
  }

  return entries.filter((entry) =>
    [
      "pending_payment",
      "paid",
      "dispatching",
      "assigned",
      "en_route",
      "arrived",
      "in_progress",
      "completed",
      "cancelled",
      "failed",
    ].includes(entry.key)
  );
};

export const orderRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);

    const list = await db.query.orders.findMany({
      orderBy: desc(orders.createdAt),
      where: eq(orders.customerId, customer.id),
    });

    return c.json({ orders: list }, 200);
  })
  .get("/:orderId", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const orderId = parseOrderId(c.req.param("orderId"));

    if (!orderId) {
      return c.json({ error: "Invalid order id" }, 400);
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.customerId, customer.id)),
    });

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    const [history, legs, orderMedia, offers, address] = await Promise.all([
      db.query.orderStatusHistory.findMany({
        orderBy: desc(orderStatusHistory.changedAt),
        where: eq(orderStatusHistory.orderId, order.id),
      }),
      db.query.serviceLegs.findMany({
        orderBy: serviceLegs.sequence,
        where: eq(serviceLegs.orderId, order.id),
      }),
      db.query.orderMediaLinks.findMany({
        where: eq(orderMediaLinks.orderId, order.id),
      }),
      db.query.dispatchOffers.findMany({
        orderBy: desc(dispatchOffers.createdAt),
        where: eq(dispatchOffers.orderId, order.id),
      }),
      db.query.addresses.findFirst({
        where: eq(addresses.id, order.addressId),
      }),
    ]);

    const legIds = legs.map((leg) => leg.id);
    const legsMedia =
      legIds.length === 0
        ? []
        : await db.query.legMediaLinks.findMany({
            where: inArray(legMediaLinks.legId, legIds),
          });

    return c.json(
      {
        address: address
          ? {
              formattedAddress:
                address.formattedAddress ??
                `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`,
              id: address.id,
              latitude: address.latitude,
              longitude: address.longitude,
            }
          : null,
        customerTimeline: toCustomerTimeline(order, history),
        legs,
        legsMedia,
        offers,
        order,
        orderMedia,
        statusHistory: history,
      },
      200
    );
  })
  .get("/:orderId/status", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const orderId = parseOrderId(c.req.param("orderId"));

    if (!orderId) {
      return c.json({ error: "Invalid order id" }, 400);
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.customerId, customer.id)),
    });

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    const [history, address, latestTracking] = await Promise.all([
      db.query.orderStatusHistory.findMany({
        orderBy: desc(orderStatusHistory.changedAt),
        where: eq(orderStatusHistory.orderId, order.id),
      }),
      db.query.addresses.findFirst({
        where: eq(addresses.id, order.addressId),
      }),
      db.query.orderTrackingPoints.findFirst({
        orderBy: desc(orderTrackingPoints.capturedAt),
        where: eq(orderTrackingPoints.orderId, order.id),
      }),
    ]);

    const staleAfterSeconds = 120;
    const now = Date.now();
    const pointAgeMs = latestTracking
      ? now - latestTracking.capturedAt.getTime()
      : Number.POSITIVE_INFINITY;
    const isStale = pointAgeMs > staleAfterSeconds * 1000;

    const canShowTracking = ACTIVE_TRACKING_STATUSES.has(
      order.status as "assigned" | "en_route" | "arrived" | "in_progress"
    );

    return c.json(
      {
        activeTracking: {
          isStale,
          point:
            canShowTracking && latestTracking
              ? {
                  accuracyMeters: latestTracking.accuracyMeters,
                  capturedAt: latestTracking.capturedAt.toISOString(),
                  heading: latestTracking.heading,
                  latitude: latestTracking.latitude,
                  longitude: latestTracking.longitude,
                  speedMps: latestTracking.speedMps,
                }
              : null,
          staleAfterSeconds,
        },
        address: {
          formattedAddress: address?.formattedAddress ?? null,
          id: order.addressId,
          latitude: address?.latitude ?? null,
          longitude: address?.longitude ?? null,
        },
        order: {
          id: order.id,
          phase: mapOrderStatusToPhase(order.status),
          serviceType: order.serviceType,
          status: order.status,
          totalPriceCents: order.totalPriceCents,
        },
        timeline: toCustomerTimeline(order, history),
      },
      200
    );
  })
  .post("/:orderId/cancel", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const orderId = parseOrderId(c.req.param("orderId"));

    if (!orderId) {
      return c.json({ error: "Invalid order id" }, 400);
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.customerId, customer.id)),
    });

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (["completed", "cancelled", "failed"].includes(order.status)) {
      return c.json({ error: "Order can no longer be cancelled" }, 409);
    }

    await setOrderStatus({
      note: "Cancelled by customer",
      orderId: order.id,
      toStatus: "cancelled",
      triggeredByUserId: userResult.user.id,
    });

    await db
      .update(dispatchOffers)
      .set({
        respondedAt: new Date(),
        status: "cancelled",
      })
      .where(
        and(
          eq(dispatchOffers.orderId, order.id),
          eq(dispatchOffers.status, "pending")
        )
      );

    await publishOutboxEvent({
      eventName: "order_cancelled",
      payload: {
        customerId: customer.id,
        orderId: order.id,
      },
    });

    return c.json({ ok: true }, 200);
  });
