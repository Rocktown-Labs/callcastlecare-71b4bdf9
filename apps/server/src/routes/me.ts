import { db, eq } from "@callcastlecare/db";
import { customers } from "@callcastlecare/db/schema/index";
import { Hono } from "hono";

import { getOrCreateCustomerForUser, requireUser } from "../lib/auth";
import type { AppEnv } from "../types";
import { updateCustomerProfileRequestSchema } from "./schemas";

export const meRoutes = new Hono<AppEnv>()
  .get("/profile", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    return c.json({ customer }, 200);
  })
  .patch("/profile", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const payload = await c.req.json();
    const parsed = updateCustomerProfileRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return c.json({ customer }, 200);
    }

    const updatedRows = await db
      .update(customers)
      .set({
        ...(updates.firstName ? { firstName: updates.firstName } : {}),
        ...(updates.lastName ? { lastName: updates.lastName } : {}),
        ...(updates.phone ? { phone: updates.phone } : {}),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id))
      .returning();

    const updated = updatedRows[0];
    if (!updated) {
      return c.json({ error: "Failed to update customer profile" }, 500);
    }

    return c.json({ customer: updated }, 200);
  });
