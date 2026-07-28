import { db } from "@callcastlecare/db";
import { supportRequests } from "@callcastlecare/db/schema/index";
import { Hono } from "hono";

import { getOrCreateCustomerForUser } from "../lib/auth";
import { logger } from "../lib/logger";
import type { AppEnv } from "../types";
import { supportRequestSchema } from "./schemas";

const cleanOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

export const supportRoutes = new Hono<AppEnv>().post("/", async (c) => {
  const body = await c.req.json();
  const parsed = supportRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const user = c.get("user");
  const customer = user ? await getOrCreateCustomerForUser(user) : null;
  const request = parsed.data;

  const inserted = await db
    .insert(supportRequests)
    .values({
      addressText: cleanOptional(request.addressText),
      city: cleanOptional(request.city),
      customerId: customer?.id ?? null,
      email: request.email,
      message: request.message,
      metadataJson: {
        authenticated: Boolean(user),
      },
      name: request.name,
      orderId: request.orderId ?? null,
      orderNumber: cleanOptional(request.orderNumber),
      phone: cleanOptional(request.phone),
      requestType: request.requestType,
      serviceType: request.serviceType,
      sourcePath: cleanOptional(request.sourcePath),
      state: cleanOptional(request.state),
      userId: user?.id ?? null,
      zip: cleanOptional(request.zip),
    })
    .returning();

  const [created] = inserted;
  if (!created) {
    return c.json({ error: "Unable to create support request" }, 500);
  }

  logger.info(
    {
      requestId: created.id,
      requestType: created.requestType,
      userId: user?.id ?? null,
    },
    "support_request:created"
  );

  return c.json({ request: created }, 201);
});
