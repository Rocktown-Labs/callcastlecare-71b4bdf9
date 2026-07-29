import { db, eq } from "@callcastlecare/db";
import {
  customers,
  user as authUsers,
  workers,
} from "@callcastlecare/db/schema/index";
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

  const [firstName, ...rest] = trimmed.split(/\s+/u);
  const lastName = rest.join(" ");
  return {
    firstName: firstName ?? "Castle",
    lastName: lastName.length > 0 ? lastName : "Customer",
  };
};

export const requireUser = (c: Context) => {
  const currentUser = c.get("user");
  if (!currentUser) {
    return {
      error: c.json({ error: "unauthorized" }, 401),
      user: null,
    };
  }
  return {
    error: null,
    user: currentUser,
  };
};

export const getOrCreateCustomerForUser = async (
  currentUser: NonNullable<ReturnType<typeof requireUser>["user"]>
) => {
  const existing = await db.query.customers.findFirst({
    where: eq(customers.userId, currentUser.id),
  });

  if (existing) {
    return existing;
  }

  const { firstName, lastName } = parseName(currentUser.name);
  const inserted = await db
    .insert(customers)
    .values({
      email: currentUser.email,
      firstName,
      lastName,
      phone: "",
      userId: currentUser.id,
    })
    .returning();

  const [created] = inserted;
  if (!created) {
    throw new Error("Failed to create customer for authenticated user");
  }

  logger.info(
    {
      customerId: created.id,
      userId: currentUser.id,
    },
    "customer:created"
  );

  return created;
};

export const getOrCreateCustomerForCheckoutContact = async (input: {
  email: string;
  name: string;
  phone: string;
}) => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existingCustomer = await db.query.customers.findFirst({
    where: eq(customers.email, normalizedEmail),
  });

  if (existingCustomer) {
    return existingCustomer;
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(authUsers.email, normalizedEmail),
  });
  const insertedUsers = existingUser
    ? []
    : await db
        .insert(authUsers)
        .values({
          email: normalizedEmail,
          emailVerified: false,
          id: `guest_${crypto.randomUUID()}`,
          name: input.name.trim(),
        })
        .returning();
  const [insertedUser] = insertedUsers;
  const checkoutUser = existingUser ?? insertedUser;

  if (!checkoutUser) {
    throw new Error("Failed to create checkout user");
  }

  const { firstName, lastName } = parseName(input.name);
  const inserted = await db
    .insert(customers)
    .values({
      email: normalizedEmail,
      firstName,
      lastName,
      phone: input.phone,
      userId: checkoutUser.id,
    })
    .returning();

  const [created] = inserted;
  if (!created) {
    throw new Error("Failed to create customer for checkout contact");
  }

  logger.info(
    {
      customerId: created.id,
      userId: checkoutUser.id,
    },
    "customer:created_from_public_checkout"
  );

  return created;
};

export const requireWorkerForUser = async (
  currentUser: NonNullable<ReturnType<typeof requireUser>["user"]>
) => {
  const worker = await db.query.workers.findFirst({
    where: eq(workers.userId, currentUser.id),
  });

  if (!worker) {
    return null;
  }

  return worker;
};
