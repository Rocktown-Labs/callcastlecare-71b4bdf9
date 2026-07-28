import { db, eq } from "@callcastlecare/db";
import { customers, workers } from "@callcastlecare/db/schema/index";
import type { Context } from "hono";

import { logger } from "./logger";

const parseName = (name: string | null | undefined) => {
  const trimmed = name?.trim() ?? "";
  if (trimmed.length === 0) {
    return {
      firstName: "Castle",
      lastName: "Customer",
    };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  const lastName = rest.join(" ");
  return {
    firstName: firstName ?? "Castle",
    lastName: lastName.length > 0 ? lastName : "Customer",
  };
};

export const requireUser = (c: Context) => {
  const user = c.get("user");
  if (!user) {
    return {
      error: c.json({ error: "unauthorized" }, 401),
      user: null,
    };
  }
  return {
    error: null,
    user,
  };
};

export const getOrCreateCustomerForUser = async (
  user: NonNullable<ReturnType<typeof requireUser>["user"]>
) => {
  const existing = await db.query.customers.findFirst({
    where: eq(customers.userId, user.id),
  });

  if (existing) {
    return existing;
  }

  const { firstName, lastName } = parseName(user.name);
  const inserted = await db
    .insert(customers)
    .values({
      email: user.email,
      firstName,
      lastName,
      phone: "",
      userId: user.id,
    })
    .returning();

  const created = inserted[0];
  if (!created) {
    throw new Error("Failed to create customer for authenticated user");
  }

  logger.info(
    {
      customerId: created.id,
      userId: user.id,
    },
    "customer:created"
  );

  return created;
};

export const requireWorkerForUser = async (
  user: NonNullable<ReturnType<typeof requireUser>["user"]>
) => {
  const worker = await db.query.workers.findFirst({
    where: eq(workers.userId, user.id),
  });

  if (!worker) {
    return null;
  }

  return worker;
};
