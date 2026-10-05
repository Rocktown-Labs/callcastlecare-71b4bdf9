import { and, db, eq } from "@callcastlecare/db";
import {
  serviceSubscriptions,
  user as authUsers,
} from "@callcastlecare/db/schema/index";
import { Hono } from "hono";
import { z } from "zod";

import { getOrCreateCustomerForUser, requireUser } from "../lib/auth";
import {
  getStripeClient,
  getStripeRequestOptions,
} from "../lib/integrations/stripe-client";
import { logger } from "../lib/logger";
import type { AppEnv } from "../types";

const subscriptionIdSchema = z.coerce.number().int().positive();

const normalizeSubscription = (
  subscription: typeof serviceSubscriptions.$inferSelect
) => ({
  billingInterval: subscription.billingInterval,
  cancelAt: subscription.cancelAt?.toISOString() ?? null,
  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  canceledAt: subscription.canceledAt?.toISOString() ?? null,
  currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
  currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
  id: subscription.id,
  planCode: subscription.planCode,
  status: subscription.status,
});

export const subscriptionRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const subscriptions = await db.query.serviceSubscriptions.findMany({
      where: eq(serviceSubscriptions.customerId, customer.id),
    });
    return c.json(
      { subscriptions: subscriptions.map(normalizeSubscription) },
      200
    );
  })
  .post("/portal", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return c.json({ error: "Stripe billing is not configured" }, 503);
    }

    const stripeCustomer = await db.query.user.findFirst({
      columns: { stripeCustomerId: true },
      where: eq(authUsers.id, userResult.user.id),
    });
    if (!stripeCustomer?.stripeCustomerId) {
      return c.json({ error: "No Stripe billing customer found" }, 404);
    }

    const { origin } = new URL(c.req.url);
    const portal = await stripe.billingPortal.sessions.create(
      {
        customer: stripeCustomer.stripeCustomerId,
        return_url: `${origin}/dashboard/settings`,
      },
      getStripeRequestOptions(
        "billing-portal",
        userResult.user.id,
        crypto.randomUUID()
      )
    );
    return c.json({ url: portal.url }, 200);
  })
  .post("/:subscriptionId/cancel", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const parsedId = subscriptionIdSchema.safeParse(
      c.req.param("subscriptionId")
    );
    if (!parsedId.success) {
      return c.json({ error: "Invalid subscription id" }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const subscription = await db.query.serviceSubscriptions.findFirst({
      where: and(
        eq(serviceSubscriptions.id, parsedId.data),
        eq(serviceSubscriptions.customerId, customer.id)
      ),
    });
    if (!subscription) {
      return c.json({ error: "Subscription not found" }, 404);
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return c.json({ error: "Stripe billing is not configured" }, 503);
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true },
      getStripeRequestOptions(
        "cancel-subscription",
        subscription.stripeSubscriptionId
      )
    );
    const [updated] = await db
      .update(serviceSubscriptions)
      .set({
        cancelAt: updatedStripeSubscription.cancel_at
          ? new Date(updatedStripeSubscription.cancel_at * 1000)
          : null,
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(serviceSubscriptions.id, subscription.id))
      .returning();

    logger.info(
      {
        customerId: customer.id,
        serviceSubscriptionId: subscription.id,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        userId: userResult.user.id,
      },
      "subscription:cancel_at_period_end_requested"
    );
    return c.json(
      { subscription: updated ? normalizeSubscription(updated) : null },
      200
    );
  });
