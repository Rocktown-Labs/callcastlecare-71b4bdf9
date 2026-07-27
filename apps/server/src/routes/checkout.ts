import { and, db, eq } from "@callcastlecare/db";
import {
  addresses,
  checkoutDrafts,
  checkoutItems,
  checkoutSessions,
  homePreorders,
  homeQuotes,
  orders,
  quoteRequests,
} from "@callcastlecare/db/schema/index";
import { Hono } from "hono";

import { requireUser, getOrCreateCustomerForUser } from "../lib/auth";
import { computeCheckoutPreview } from "../lib/domain/checkout";
import { verifyAddressWithRadar } from "../lib/integrations/radar";
import {
  createStripePaymentIntent,
  parseStripeWebhookEvent,
} from "../lib/integrations/stripe-payments";
import { logger } from "../lib/logger";
import { createAddressRecord, finalizeCheckoutPayment } from "../lib/orders";
import type { AppEnv } from "../types";
import {
  checkoutDraftRequestSchema,
  checkoutConfirmRequestSchema,
  checkoutPreviewRequestSchema,
  publicQuoteRequestSchema,
} from "./schemas";

const parsePositiveId = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseScheduledDate = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

interface PublicQuoteRequestInput {
  address?: string;
  contact?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  lastCompletedStep: number;
  payload: Record<string, unknown>;
  status:
    | "draft"
    | "contact_captured"
    | "checkout_started"
    | "paid"
    | "abandoned"
    | "cancelled";
  trackingId: string;
}

const resolveQuoteRequestStatus = (input: PublicQuoteRequestInput) =>
  input.lastCompletedStep >= 2 && input.status === "draft"
    ? "contact_captured"
    : input.status;

const toQuoteRequestValues = (input: PublicQuoteRequestInput) => ({
  addressText: input.address ?? null,
  contactEmail: input.contact?.email || null,
  contactName: input.contact?.name || null,
  contactPhone: input.contact?.phone || null,
  lastCompletedStep: input.lastCompletedStep,
  payloadJson: input.payload,
  status: resolveQuoteRequestStatus(input),
});

const toQuoteRequestResponse = (quoteRequest: {
  id: number;
  status: string;
  trackingId: string;
  updatedAt: Date;
}) => ({
  id: quoteRequest.id,
  status: quoteRequest.status,
  trackingId: quoteRequest.trackingId,
  updatedAt: quoteRequest.updatedAt.toISOString(),
});

const upsertPublicQuoteRequest = async (input: PublicQuoteRequestInput) => {
  const existing = await db.query.quoteRequests.findFirst({
    where: eq(quoteRequests.trackingId, input.trackingId),
  });

  if (existing) {
    const [updated] = await db
      .update(quoteRequests)
      .set({
        ...toQuoteRequestValues(input),
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, existing.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update quote request");
    }

    return { quoteRequest: updated, statusCode: 200 as const };
  }

  const [created] = await db
    .insert(quoteRequests)
    .values({
      ...toQuoteRequestValues(input),
      trackingId: input.trackingId,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create quote request");
  }

  return { quoteRequest: created, statusCode: 201 as const };
};

export const checkoutRoutes = new Hono<AppEnv>()
  .post("/preview", async (c) => {
    const body = await c.req.json();
    const parsed = checkoutPreviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    let resolvedAddress: string | null = parsed.data.address ?? null;
    let resolvedAddressId: number | null = parsed.data.addressId ?? null;

    if (parsed.data.addressId) {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "unauthorized" }, 401);
      }

      const customer = await getOrCreateCustomerForUser(user);
      const existingAddress = await db.query.addresses.findFirst({
        where: and(
          eq(addresses.id, parsed.data.addressId),
          eq(addresses.customerId, customer.id)
        ),
      });

      if (!existingAddress) {
        return c.json({ error: "Address not found" }, 404);
      }

      resolvedAddressId = existingAddress.id;
      resolvedAddress =
        existingAddress.formattedAddress ??
        `${existingAddress.street}, ${existingAddress.city}, ${existingAddress.state} ${existingAddress.zip}, ${existingAddress.country}`;
    }

    const preview = computeCheckoutPreview(parsed.data);

    return c.json(
      {
        address: resolvedAddress,
        addressId: resolvedAddressId,
        lineItems: preview.lineItems,
        subtotalCents: preview.subtotalCents,
        totalCents: preview.totalCents,
      },
      200
    );
  })
  .put("/quote-request", async (c) => {
    const body = await c.req.json();
    const parsed = publicQuoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const { quoteRequest, statusCode } = await upsertPublicQuoteRequest(
      parsed.data
    );

    logger.info(
      {
        lastCompletedStep: quoteRequest.lastCompletedStep,
        quoteRequestId: quoteRequest.id,
        requestId: c.get("requestId"),
        status: quoteRequest.status,
      },
      statusCode === 201 ? "quote_request:created" : "quote_request:updated"
    );

    return c.json(
      {
        quoteRequest: toQuoteRequestResponse(quoteRequest),
      },
      statusCode
    );
  })
  .post("/confirm", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const body = await c.req.json();
    const parsed = checkoutConfirmRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    if (!customer.phone || customer.phone.trim().length < 7) {
      return c.json(
        {
          error:
            "Phone number is required before checkout confirmation. Please update your profile.",
        },
        409
      );
    }

    let address: { id: number } | null = null;

    if (parsed.data.addressId) {
      const existingAddress = await db.query.addresses.findFirst({
        where: and(
          eq(addresses.id, parsed.data.addressId),
          eq(addresses.customerId, customer.id)
        ),
      });

      if (!existingAddress) {
        return c.json({ error: "Address not found" }, 404);
      }

      address = existingAddress;
    } else if (parsed.data.address) {
      const verifiedAddress = await verifyAddressWithRadar(parsed.data.address);
      address = await createAddressRecord({
        city: verifiedAddress.city,
        country: verifiedAddress.country,
        customerId: customer.id,
        formattedAddress: parsed.data.address,
        isDefault: false,
        latitude: verifiedAddress.latitude,
        longitude: verifiedAddress.longitude,
        radarGeocodeJson: verifiedAddress.raw,
        state: verifiedAddress.state,
        street: verifiedAddress.street,
        zip: verifiedAddress.zip,
      });
    }

    if (!address) {
      return c.json({ error: "Address is required" }, 400);
    }

    const preview = computeCheckoutPreview(parsed.data);

    const [checkoutSession] = await db
      .insert(checkoutSessions)
      .values({
        addressId: address.id,
        customerId: customer.id,
        metadataJson: {
          requestId: c.get("requestId"),
        },
        status: "pending_payment",
        subtotalCents: preview.subtotalCents,
        totalCents: preview.totalCents,
      })
      .returning();

    if (!checkoutSession) {
      return c.json({ error: "Failed to create checkout session" }, 500);
    }

    await db.insert(checkoutItems).values(
      preview.lineItems.map((lineItem) => ({
        ...(lineItem.metadata.timingType === "scheduled"
          ? { timingType: "scheduled" as const }
          : { timingType: "asap" as const }),
        basePriceCents: lineItem.basePriceCents,
        checkoutSessionId: checkoutSession.id,
        itemKind: lineItem.itemKind,
        label: lineItem.label,
        metadataJson: lineItem.metadata,
        quantity: lineItem.quantity,
        scheduledEndAt: parseScheduledDate(
          lineItem.metadata.scheduledEndAt as string | undefined
        ),
        scheduledStartAt: parseScheduledDate(
          lineItem.metadata.scheduledStartAt as string | undefined
        ),
        tipAmountCents: lineItem.tipAmountCents,
        totalPriceCents: lineItem.totalPriceCents,
      }))
    );

    await Promise.all(
      preview.lineItems.map(async (lineItem) => {
        if (lineItem.itemKind !== "home_preorder") {
          return;
        }

        const homeQuoteId =
          typeof lineItem.metadata.homeQuoteId === "number"
            ? lineItem.metadata.homeQuoteId
            : null;

        if (homeQuoteId === null) {
          return;
        }

        const quote = await db.query.homeQuotes.findFirst({
          where: eq(homeQuotes.id, homeQuoteId),
        });

        if (!quote) {
          return;
        }

        await db.insert(homePreorders).values({
          addressId: address.id,
          checkoutSessionId: checkoutSession.id,
          customerId: customer.id,
          depositAmountCents: lineItem.basePriceCents,
          homeQuoteId,
          status: "pending_payment",
        });
      })
    );

    const paymentIntent = await createStripePaymentIntent({
      amountCents: preview.totalCents,
      metadata: {
        checkoutSessionId: String(checkoutSession.id),
        customerId: String(customer.id),
      },
    });

    await db
      .update(checkoutSessions)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, checkoutSession.id));

    return c.json(
      {
        checkoutSessionId: checkoutSession.id,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id,
        status: "pending_payment",
      },
      200
    );
  })
  .put("/draft", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const body = await c.req.json();
    const parsed = checkoutDraftRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const existing = await db.query.checkoutDrafts.findFirst({
      where: eq(checkoutDrafts.customerId, customer.id),
    });

    if (existing) {
      const [updated] = await db
        .update(checkoutDrafts)
        .set({
          payloadJson: parsed.data.payload,
          updatedAt: new Date(),
        })
        .where(eq(checkoutDrafts.id, existing.id))
        .returning();

      if (!updated) {
        return c.json({ error: "Failed to update checkout draft" }, 500);
      }

      return c.json(
        {
          draft: {
            checkoutDraftId: updated.id,
            payload: updated.payloadJson as Record<string, unknown>,
            updatedAt: updated.updatedAt.toISOString(),
          },
        },
        200
      );
    }

    const [created] = await db
      .insert(checkoutDrafts)
      .values({
        customerId: customer.id,
        payloadJson: parsed.data.payload,
      })
      .returning();

    if (!created) {
      return c.json({ error: "Failed to create checkout draft" }, 500);
    }

    return c.json(
      {
        draft: {
          checkoutDraftId: created.id,
          payload: created.payloadJson as Record<string, unknown>,
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      200
    );
  })
  .get("/draft", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const draft = await db.query.checkoutDrafts.findFirst({
      where: eq(checkoutDrafts.customerId, customer.id),
    });

    if (!draft) {
      return c.json({ draft: null }, 200);
    }

    return c.json(
      {
        draft: {
          checkoutDraftId: draft.id,
          payload: draft.payloadJson as Record<string, unknown>,
          updatedAt: draft.updatedAt.toISOString(),
        },
      },
      200
    );
  })
  .get("/sessions/:sessionId", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const sessionId = parsePositiveId(c.req.param("sessionId"));
    if (!sessionId) {
      return c.json({ error: "Invalid checkout session id" }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const checkoutSession = await db.query.checkoutSessions.findFirst({
      where: and(
        eq(checkoutSessions.id, sessionId),
        eq(checkoutSessions.customerId, customer.id)
      ),
    });

    if (!checkoutSession) {
      return c.json({ error: "Checkout session not found" }, 404);
    }

    const relatedOrders = await db.query.orders.findMany({
      columns: {
        id: true,
      },
      where: eq(orders.checkoutSessionId, checkoutSession.id),
    });

    return c.json(
      {
        checkoutSessionId: checkoutSession.id,
        createdOrderIds: relatedOrders.map((entry) => entry.id),
        status: checkoutSession.status,
      },
      200
    );
  })
  .post("/webhook/stripe", async (c) => {
    const rawBody = await c.req.text();

    const parsedEvent = await parseStripeWebhookEvent({
      rawBody,
      signatureHeader: c.req.header("stripe-signature"),
    });

    if (!parsedEvent) {
      return c.json({ error: "invalid webhook payload" }, 400);
    }

    if (parsedEvent.type !== "payment_intent.succeeded") {
      return c.json({ received: true }, 200);
    }

    const paymentIntentObject = parsedEvent.data.object;
    const paymentIntentId =
      typeof paymentIntentObject.id === "string"
        ? paymentIntentObject.id
        : null;

    if (!paymentIntentId) {
      return c.json({ received: true }, 200);
    }

    const metadata =
      typeof paymentIntentObject.metadata === "object" &&
      paymentIntentObject.metadata
        ? (paymentIntentObject.metadata as Record<string, unknown>)
        : null;

    const checkoutSessionIdFromMetadata = metadata
      ? Number(metadata.checkoutSessionId)
      : null;

    if (
      checkoutSessionIdFromMetadata &&
      Number.isInteger(checkoutSessionIdFromMetadata)
    ) {
      await finalizeCheckoutPayment({
        checkoutSessionId: checkoutSessionIdFromMetadata,
        stripePaymentIntentId: paymentIntentId,
      });
      return c.json({ received: true }, 200);
    }

    const checkoutSession = await db.query.checkoutSessions.findFirst({
      where: eq(checkoutSessions.stripePaymentIntentId, paymentIntentId),
    });

    if (!checkoutSession) {
      logger.warn(
        {
          paymentIntentId,
        },
        "stripe_webhook:session_not_found"
      );
      return c.json({ received: true }, 200);
    }

    await finalizeCheckoutPayment({
      checkoutSessionId: checkoutSession.id,
      stripePaymentIntentId: paymentIntentId,
    });

    return c.json({ received: true }, 200);
  });
