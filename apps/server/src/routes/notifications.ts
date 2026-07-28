import { db, and, desc, eq } from "@callcastlecare/db";
import { notifications } from "@callcastlecare/db/schema/index";
import { Hono } from "hono";

import { getOrCreateCustomerForUser, requireUser } from "../lib/auth";
import type { AppEnv } from "../types";

const parseNotificationId = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const notificationRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const list = await db.query.notifications.findMany({
      orderBy: desc(notifications.createdAt),
      where: eq(notifications.customerId, customer.id),
    });

    return c.json({ notifications: list }, 200);
  })
  .post("/:id/read", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const notificationId = parseNotificationId(c.req.param("id"));

    if (!notificationId) {
      return c.json({ error: "Invalid notification id" }, 400);
    }

    const notification = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.id, notificationId),
        eq(notifications.customerId, customer.id)
      ),
    });

    if (!notification) {
      return c.json({ error: "Notification not found" }, 404);
    }

    await db
      .update(notifications)
      .set({
        readAt: new Date(),
      })
      .where(eq(notifications.id, notification.id));

    return c.json({ ok: true }, 200);
  });
