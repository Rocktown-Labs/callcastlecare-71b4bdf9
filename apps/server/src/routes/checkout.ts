import {
  bookingTimeSlots,
  buildTravelEstimate,
  getBookingZoneDate,
  getLawncareLotTier,
  getLawncarePlanId,
  getScheduledWindowForSlot,
} from "@callcastlecare/api";
import type { CheckoutPreviewRequest } from "@callcastlecare/api";
import { auth } from "@callcastlecare/auth";
import { and, db, eq, gt, inArray, lt, sql } from "@callcastlecare/db";
import {
  addresses,
  checkoutDrafts,
  checkoutItems,
  checkoutSessions,
  homePreorders,
  homeQuotes,
  orders,
  quoteRequests,
  user as authUsers,
  workers,
} from "@callcastlecare/db/schema/index";
import { renderProviderApplicationReceivedEmail } from "@callcastlecare/email";
import { env } from "@callcastlecare/env/server";
import { Hono } from "hono";
import type { Context as HonoContext } from "hono";
import { z } from "zod";

import {
  getOrCreateCustomerForCheckoutContact,
  requireUser,
  getOrCreateCustomerForUser,
} from "../lib/auth";
import { getCheckoutSettings } from "../lib/checkout-settings";
import {
  computeCheckoutPreview,
  getComboPricingTier,
  getComboServiceTypes,
  isRecurringCheckoutItem,
} from "../lib/domain/checkout";
import { sendEmail } from "../lib/integrations/email";
import { verifyAddressWithRadar } from "../lib/integrations/radar";
import { lookupPropertyWithRentCast } from "../lib/integrations/rentcast";
import {
  createStripeCheckoutSession,
  parseStripeWebhookEvent,
} from "../lib/integrations/stripe-payments";
import type { StripeWebhookEvent } from "../lib/integrations/stripe-payments";
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

const depositCents = 5000;
const SQFT_PER_ACRE = 43_560;
const CHECKOUT_SLOT_LOCK_KEY = 7_318_204;
const CHECKOUT_SLOT_HOLD_MS = 30 * 60 * 1000;
const ACTIVE_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "dispatching",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
] as const;

class CheckoutSlotUnavailableError extends Error {
  constructor() {
    super("That appointment window was just reserved. Choose another time.");
    this.name = "CheckoutSlotUnavailableError";
  }
}

interface ScheduledCheckoutSlot {
  end: Date;
  start: Date;
}

const getScheduledCheckoutSlots = (
  items: {
    scheduledEndAt?: string;
    scheduledStartAt?: string;
    timingType?: "asap" | "scheduled";
  }[]
): ScheduledCheckoutSlot[] => {
  const slots = new Map<string, ScheduledCheckoutSlot>();

  for (const item of items) {
    const isScheduled =
      item.timingType === "scheduled" ||
      (item.timingType === undefined && item.scheduledStartAt);
    if (!isScheduled) {
      continue;
    }

    if (!(item.scheduledStartAt && item.scheduledEndAt)) {
      throw new Error("Scheduled services require an appointment window.");
    }

    const start = new Date(item.scheduledStartAt);
    const end = new Date(item.scheduledEndAt);
    const bookingDate = getBookingZoneDate(start);
    const isKnownSlot = bookingTimeSlots.some((slot) => {
      const scheduledWindow = getScheduledWindowForSlot(bookingDate, slot);
      return (
        scheduledWindow.scheduledStartAt === start.toISOString() &&
        scheduledWindow.scheduledEndAt === end.toISOString()
      );
    });

    if (!isKnownSlot) {
      throw new Error("Choose an available CastleCare appointment window.");
    }

    slots.set(start.toISOString(), { end, start });
  }

  return [...slots.values()];
};

const getCheckoutOrigin = (c: HonoContext) => {
  const requestOrigin = new URL(c.req.url).origin;
  if (env.CORS_ORIGIN && env.CORS_ORIGIN !== "*") {
    return env.CORS_ORIGIN;
  }
  return requestOrigin;
};

const getAmountDueCents = (input: {
  paymentOption: "deposit_cash" | "deposit_invoice" | "pay_full";
  totalCents: number;
}) =>
  input.paymentOption === "pay_full"
    ? input.totalCents
    : Math.min(depositCents, input.totalCents);

const getAddressLabel = (address: {
  city: string;
  country: string;
  formattedAddress?: string | null;
  state: string;
  street: string;
  zip: string;
}) =>
  address.formattedAddress ??
  `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;

const getTrustedTravelEstimate = (address: {
  latitude: number | null;
  longitude: number | null;
  state: string;
}) => {
  if (
    typeof address.latitude !== "number" ||
    typeof address.longitude !== "number"
  ) {
    return null;
  }

  return buildTravelEstimate({
    latitude: address.latitude,
    longitude: address.longitude,
    stateCode: address.state,
  });
};

const getLawncareFrequency = (planId: string) => {
  if (planId.includes("bi-weekly")) {
    return "bi_weekly" as const;
  }
  if (planId.includes("monthly")) {
    return "monthly" as const;
  }
  return "one_time" as const;
};

const validateLawncarePlans = async (input: {
  address: {
    city: string;
    country: string;
    formattedAddress?: string | null;
    state: string;
    street: string;
    zip: string;
  };
  items: CheckoutPreviewRequest["items"];
}) => {
  const lawncareItems = input.items.filter(
    (item) => item.itemKind === "lawncare"
  );
  if (lawncareItems.length === 0) {
    return null;
  }

  const property = await lookupPropertyWithRentCast(
    getAddressLabel(input.address)
  );
  const lotSizeAcres =
    property.source === "rentcast" &&
    typeof property.lotSizeSqft === "number" &&
    property.lotSizeSqft > 0
      ? property.lotSizeSqft / SQFT_PER_ACRE
      : null;
  const lotTier = getLawncareLotTier(lotSizeAcres);

  for (const item of lawncareItems) {
    if (!item.planId) {
      return "Choose a lawn care product before checkout.";
    }

    const comboServices = getComboServiceTypes(item.planId);
    if (comboServices) {
      if (!comboServices.some((serviceType) => serviceType === "lawncare")) {
        continue;
      }
      if (lotTier === "custom") {
        return "This property needs an on-site custom lawn care quote.";
      }
      if (getComboPricingTier(item.planId) !== lotTier) {
        return "The selected lawn care plan does not match this property.";
      }
      continue;
    }

    const expectedPlanId =
      lotTier === "custom"
        ? "groundskeeper-custom-quote-deposit"
        : getLawncarePlanId({
            frequency: getLawncareFrequency(item.planId),
            lotSizeAcres,
          });
    if (item.planId !== expectedPlanId) {
      return lotTier === "custom"
        ? "This property needs an on-site custom lawn care quote."
        : "The selected lawn care plan does not match this property.";
    }
  }

  return null;
};

const getObjectMetadata = (value: Record<string, unknown>) =>
  typeof value.metadata === "object" && value.metadata
    ? (value.metadata as Record<string, unknown>)
    : null;

const finalizeFromMetadata = async (input: {
  metadata: Record<string, unknown> | null;
  stripePaymentIntentId?: string;
}) => {
  const checkoutSessionId = input.metadata
    ? Number(input.metadata.checkoutSessionId)
    : null;

  if (!(checkoutSessionId && Number.isInteger(checkoutSessionId))) {
    return false;
  }

  await finalizeCheckoutPayment({
    checkoutSessionId,
    ...(input.stripePaymentIntentId
      ? { stripePaymentIntentId: input.stripePaymentIntentId }
      : {}),
  });
  return true;
};

const PROVIDER_TEMP_PASSWORD = "TempPassword123!";

const getProviderPlanLabel = (plan: string) =>
  plan === "pro" ? "CastleCare Pro" : "Standard Provider";

const getOrCreateProviderUser = async (input: {
  email: string;
  firstName: string;
  lastName: string;
}) => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await db.query.user.findFirst({
    where: eq(authUsers.email, normalizedEmail),
  });
  if (existingUser) {
    return existingUser;
  }

  const signup = await auth.api.signUpEmail({
    body: {
      callbackURL: "/dashboard/provider",
      email: normalizedEmail,
      name: `${input.firstName} ${input.lastName}`.trim(),
      password: PROVIDER_TEMP_PASSWORD,
    },
  });

  logger.info(
    {
      email: normalizedEmail,
      userId: signup.user.id,
    },
    "provider:account_created_from_checkout"
  );

  return signup.user;
};

const handleProviderExpressOnboarding = async (input: {
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
}) => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await getOrCreateProviderUser({
    email: normalizedEmail,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  const rows = await db
    .insert(workers)
    .values({
      applicationFormData: {
        source: "express_onboarding_checkout",
        ...(input.plan ? { plan: input.plan } : {}),
      },
      email: normalizedEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: "",
      serviceRadiusMiles: 10,
      servicesOffered: [],
      userId: user.id,
    })
    .onConflictDoUpdate({
      set: {
        applicationFormData: {
          source: "express_onboarding_checkout",
          ...(input.plan ? { plan: input.plan } : {}),
        },
        updatedAt: new Date(),
      },
      target: workers.userId,
    })
    .returning();

  const [worker] = rows;
  if (!worker) {
    logger.error(
      {
        email: normalizedEmail,
        userId: user.id,
      },
      "provider:worker_record_create_failed"
    );
    return;
  }

  logger.info(
    {
      email: normalizedEmail,
      plan: input.plan,
      workerId: worker.id,
    },
    "provider:application_recorded_from_checkout"
  );

  try {
    const renderedEmail = await renderProviderApplicationReceivedEmail({
      applicantName: input.firstName,
      planName: getProviderPlanLabel(input.plan),
      services: [],
    });

    await sendEmail({
      html: renderedEmail.html,
      idempotencyKey: `provider-checkout/${worker.id}/application-received`,
      subject: "Your CastleCare Provider Application is Received",
      text: renderedEmail.text,
      to: normalizedEmail,
    });
  } catch (error) {
    logger.error(
      {
        error,
        workerId: worker.id,
      },
      "provider:application_email_send_failed"
    );
  }
};

const handleCheckoutSessionCompleted = async (event: StripeWebhookEvent) => {
  const checkoutObject = event.data.object;
  const metadata = getObjectMetadata(checkoutObject);

  if (metadata?.type === "provider_express_onboarding") {
    const email = typeof metadata.email === "string" ? metadata.email : null;
    const firstName =
      typeof metadata.firstName === "string" ? metadata.firstName : "";
    const lastName =
      typeof metadata.lastName === "string" ? metadata.lastName : "";
    const plan = typeof metadata.plan === "string" ? metadata.plan : "free";

    if (email) {
      await handleProviderExpressOnboarding({
        email,
        firstName,
        lastName,
        plan,
      });
    }
    return;
  }

  const stripeCheckoutSessionId =
    typeof checkoutObject.id === "string" ? checkoutObject.id : null;
  const stripePaymentIntentId =
    typeof checkoutObject.payment_intent === "string"
      ? checkoutObject.payment_intent
      : undefined;

  const finalizedFromMetadata = await finalizeFromMetadata({
    metadata: getObjectMetadata(checkoutObject),
    ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
  });
  if (finalizedFromMetadata || !stripeCheckoutSessionId) {
    return;
  }

  const checkoutSession = await db.query.checkoutSessions.findFirst({
    where: eq(
      checkoutSessions.stripeCheckoutSessionId,
      stripeCheckoutSessionId
    ),
  });

  if (!checkoutSession) {
    logger.warn(
      {
        stripeCheckoutSessionId,
      },
      "stripe_webhook:checkout_session_not_found"
    );
    return;
  }

  await finalizeCheckoutPayment({
    checkoutSessionId: checkoutSession.id,
    ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
  });
};

const handleCheckoutSessionExpired = async (event: StripeWebhookEvent) => {
  const stripeSessionId =
    typeof event.data.object.id === "string" ? event.data.object.id : null;
  if (!stripeSessionId) {
    return;
  }

  await db
    .update(checkoutSessions)
    .set({
      status: "failed",
      updatedAt: new Date(),
    })
    .where(eq(checkoutSessions.stripeCheckoutSessionId, stripeSessionId));

  logger.info(
    { stripeCheckoutSessionId: stripeSessionId },
    "checkout:slot_hold_released"
  );
};

const handlePaymentIntentSucceeded = async (event: StripeWebhookEvent) => {
  const paymentIntentObject = event.data.object;
  const paymentIntentId =
    typeof paymentIntentObject.id === "string" ? paymentIntentObject.id : null;

  if (!paymentIntentId) {
    return;
  }

  const finalizedFromMetadata = await finalizeFromMetadata({
    metadata: getObjectMetadata(paymentIntentObject),
    stripePaymentIntentId: paymentIntentId,
  });
  if (finalizedFromMetadata) {
    return;
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
    return;
  }

  await finalizeCheckoutPayment({
    checkoutSessionId: checkoutSession.id,
    stripePaymentIntentId: paymentIntentId,
  });
};

export const handleStripeWebhook = async (c: HonoContext) => {
  const rawBody = await c.req.text();

  const parsedEvent = await parseStripeWebhookEvent({
    rawBody,
    signatureHeader: c.req.header("stripe-signature"),
  });

  if (!parsedEvent) {
    return c.json({ error: "invalid webhook payload" }, 400);
  }

  if (parsedEvent.type === "checkout.session.completed") {
    await handleCheckoutSessionCompleted(parsedEvent);
    return c.json({ received: true }, 200);
  }

  if (parsedEvent.type === "checkout.session.expired") {
    await handleCheckoutSessionExpired(parsedEvent);
    return c.json({ received: true }, 200);
  }

  if (parsedEvent.type === "payment_intent.succeeded") {
    await handlePaymentIntentSucceeded(parsedEvent);
  }

  return c.json({ received: true }, 200);
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

const providerCheckoutSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  plan: z.string().default("standard_provider"),
});

export const checkoutRoutes = new Hono<AppEnv>()
  .get("/settings", async (c) => {
    const settings = await getCheckoutSettings();
    return c.json(settings, 200);
  })
  .post("/provider", async (c) => {
    const body = await c.req.json();
    const parsed = providerCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const { email, firstName, lastName, plan } = parsed.data;
    const origin = getCheckoutOrigin(c);
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=provider&plan=${encodeURIComponent(plan)}`;
    const cancelUrl = `${origin}/earn#apply?checkout=cancelled`;

    const stripeCheckoutSession = await createStripeCheckoutSession({
      amountDueCents: 5000,
      cancelUrl,
      checkoutSessionId: Math.floor(Date.now() / 1000),
      customerEmail: email,
      metadata: {
        email,
        firstName,
        lastName,
        plan,
        type: "provider_express_onboarding",
      },
      successUrl,
    });

    return c.json({ url: stripeCheckoutSession.url }, 200);
  })
  .post("/preview", async (c) => {
    const body = await c.req.json();
    const parsed = checkoutPreviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    let resolvedAddress: string | null = null;
    let resolvedAddressId: number | null = parsed.data.addressId ?? null;
    let addressForPricing: {
      city: string;
      country: string;
      formattedAddress?: string | null;
      latitude: number | null;
      longitude: number | null;
      state: string;
      street: string;
      zip: string;
    } | null = null;

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
      addressForPricing = existingAddress;
      resolvedAddress = getAddressLabel(existingAddress);
    } else if (parsed.data.address) {
      const verifiedAddress = await verifyAddressWithRadar(parsed.data.address);
      addressForPricing = verifiedAddress;
      resolvedAddress = verifiedAddress.formattedAddress;
    }

    if (!addressForPricing) {
      return c.json({ error: "Address is required" }, 400);
    }

    const travel = getTrustedTravelEstimate(addressForPricing);
    if (!travel) {
      return c.json({ error: "Address could not be verified" }, 422);
    }

    const lawncarePlanError = await validateLawncarePlans({
      address: addressForPricing,
      items: parsed.data.items,
    });
    if (lawncarePlanError) {
      return c.json({ error: lawncarePlanError }, 409);
    }

    const preview = computeCheckoutPreview({
      ...parsed.data,
      travelDistanceMiles: travel.distanceMiles,
      travelFeeCents: travel.feeCents,
      travelStateCode: addressForPricing.state,
    });

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
  .get("/quote-request/:trackingId", async (c) => {
    const trackingId = c.req.param("trackingId");
    const parsed =
      publicQuoteRequestSchema.shape.trackingId.safeParse(trackingId);
    if (!parsed.success) {
      return c.json({ error: "Invalid quote request id" }, 400);
    }

    const quoteRequest = await db.query.quoteRequests
      .findFirst({
        where: eq(quoteRequests.trackingId, parsed.data),
      })
      .catch((error: unknown) => {
        logger.error(
          {
            err: error,
            requestId: c.get("requestId"),
            trackingId: parsed.data,
          },
          "quote_request:lookup_failed"
        );

        return null;
      });

    if (!quoteRequest) {
      return c.json({ error: "Quote request not found" }, 404);
    }

    return c.json(
      {
        quoteRequest: {
          ...toQuoteRequestResponse(quoteRequest),
          lastCompletedStep: quoteRequest.lastCompletedStep,
          payload: quoteRequest.payloadJson as Record<string, unknown>,
        },
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

    const result = await upsertPublicQuoteRequest(parsed.data).catch(
      (error: unknown) => {
        logger.error(
          {
            err: error,
            lastCompletedStep: parsed.data.lastCompletedStep,
            requestId: c.get("requestId"),
            status: parsed.data.status,
            trackingId: parsed.data.trackingId,
          },
          "quote_request:persist_failed"
        );

        return null;
      }
    );

    if (!result) {
      return c.json(
        {
          quoteRequest: null,
          saved: false,
          trackingId: parsed.data.trackingId,
        },
        202
      );
    }

    const { quoteRequest, statusCode } = result;

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
        saved: true,
      },
      statusCode
    );
  })
  .post("/confirm", async (c) => {
    const body = await c.req.json();
    const parsed = checkoutConfirmRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    if (parsed.data.items.some(isRecurringCheckoutItem)) {
      return c.json(
        {
          error:
            "Recurring service plans are not available yet. Choose a one-time service.",
        },
        409
      );
    }

    if (parsed.data.paymentOption === "deposit_cash") {
      const settings = await getCheckoutSettings();
      if (!settings.allowCashCheckout) {
        return c.json(
          { error: "Pay-in-cash checkout is currently disabled." },
          409
        );
      }
    }

    const user = c.get("user");
    const customer = user
      ? await getOrCreateCustomerForUser(user)
      : await getOrCreateCustomerForCheckoutContact(parsed.data.contact);

    let address: {
      city: string;
      country: string;
      formattedAddress?: string | null;
      id: number;
      latitude: number | null;
      longitude: number | null;
      state: string;
      street: string;
      zip: string;
    } | null = null;

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
        formattedAddress: verifiedAddress.formattedAddress,
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

    const travel = getTrustedTravelEstimate(address);
    if (!travel) {
      return c.json({ error: "Address could not be verified" }, 422);
    }

    const lawncarePlanError = await validateLawncarePlans({
      address,
      items: parsed.data.items,
    });
    if (lawncarePlanError) {
      return c.json({ error: lawncarePlanError }, 409);
    }

    const checkoutInput = {
      ...parsed.data,
      travelDistanceMiles: travel.distanceMiles,
      travelFeeCents: travel.feeCents,
      travelStateCode: address.state,
    } satisfies CheckoutPreviewRequest;
    let scheduledSlots: ScheduledCheckoutSlot[];
    try {
      scheduledSlots = getScheduledCheckoutSlots(checkoutInput.items);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Choose an available CastleCare appointment window.",
        },
        400
      );
    }

    const preview = computeCheckoutPreview(checkoutInput);
    const amountDueCents = getAmountDueCents({
      paymentOption: parsed.data.paymentOption,
      totalCents: preview.totalCents,
    });

    let checkoutSession;
    try {
      checkoutSession = await db.transaction(async (tx) => {
        if (scheduledSlots.length > 0) {
          await tx.execute(
            sql`SELECT pg_advisory_xact_lock(${CHECKOUT_SLOT_LOCK_KEY})`
          );

          const holdCutoff = new Date(Date.now() - CHECKOUT_SLOT_HOLD_MS);
          const slotConflicts = await Promise.all(
            scheduledSlots.map(async (slot) => {
              const [[overlappingOrder], [heldCheckout]] = await Promise.all([
                tx
                  .select({ id: orders.id })
                  .from(orders)
                  .where(
                    and(
                      inArray(orders.status, ACTIVE_ORDER_STATUSES),
                      lt(orders.scheduledStartAt, slot.end),
                      gt(orders.scheduledEndAt, slot.start)
                    )
                  )
                  .limit(1),
                tx
                  .select({ id: checkoutSessions.id })
                  .from(checkoutSessions)
                  .innerJoin(
                    checkoutItems,
                    eq(checkoutItems.checkoutSessionId, checkoutSessions.id)
                  )
                  .where(
                    and(
                      inArray(checkoutSessions.status, [
                        "pending_payment",
                        "paid",
                      ]),
                      gt(checkoutSessions.updatedAt, holdCutoff),
                      lt(checkoutItems.scheduledStartAt, slot.end),
                      gt(checkoutItems.scheduledEndAt, slot.start)
                    )
                  )
                  .limit(1),
              ]);

              return Boolean(overlappingOrder || heldCheckout);
            })
          );

          if (slotConflicts.some(Boolean)) {
            throw new CheckoutSlotUnavailableError();
          }
        }

        const [createdCheckoutSession] = await tx
          .insert(checkoutSessions)
          .values({
            addressId: address.id,
            customerId: customer.id,
            metadataJson: {
              amountDueCents,
              contact: parsed.data.contact,
              paymentOption: parsed.data.paymentOption,
              requestId: c.get("requestId"),
              travelDistanceMiles: travel.distanceMiles,
              travelFeeCents: travel.feeCents,
              travelStateCode: address.state,
            },
            status: "pending_payment",
            subtotalCents: preview.subtotalCents,
            totalCents: preview.totalCents,
          })
          .returning();

        if (!createdCheckoutSession) {
          throw new Error("Failed to create checkout session");
        }

        await tx.insert(checkoutItems).values(
          preview.lineItems.map((lineItem) => ({
            ...(lineItem.metadata.timingType === "scheduled"
              ? { timingType: "scheduled" as const }
              : { timingType: "asap" as const }),
            basePriceCents: lineItem.basePriceCents,
            checkoutSessionId: createdCheckoutSession.id,
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

        const homePreorderResults = await Promise.all(
          preview.lineItems
            .filter((lineItem) => lineItem.itemKind === "home_preorder")
            .map(async (lineItem) => {
              const homeQuoteId =
                typeof lineItem.metadata.homeQuoteId === "number"
                  ? lineItem.metadata.homeQuoteId
                  : null;

              if (homeQuoteId === null) {
                return null;
              }

              const quote = await tx.query.homeQuotes.findFirst({
                where: eq(homeQuotes.id, homeQuoteId),
              });

              if (!quote) {
                return null;
              }

              return {
                addressId: address.id,
                checkoutSessionId: createdCheckoutSession.id,
                customerId: customer.id,
                depositAmountCents: lineItem.basePriceCents,
                homeQuoteId,
                status: "pending_payment" as const,
              };
            })
        );
        const homePreorderValues = homePreorderResults.filter(
          (value) => value !== null
        );

        if (homePreorderValues.length > 0) {
          await tx.insert(homePreorders).values(homePreorderValues);
        }

        return createdCheckoutSession;
      });
    } catch (error) {
      if (error instanceof CheckoutSlotUnavailableError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }

    const origin = getCheckoutOrigin(c);
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    let stripeCheckoutSession;
    try {
      stripeCheckoutSession = await createStripeCheckoutSession({
        amountDueCents,
        cancelUrl: `${origin}/book?checkout=cancelled`,
        checkoutSessionId: checkoutSession.id,
        customerEmail: parsed.data.contact.email,
        expiresAt: new Date(Date.now() + CHECKOUT_SLOT_HOLD_MS),
        metadata: {
          amountDueCents: String(amountDueCents),
          checkoutSessionId: String(checkoutSession.id),
          customerId: String(customer.id),
          paymentOption: parsed.data.paymentOption,
          totalCents: String(preview.totalCents),
        },
        successUrl,
      });
    } catch (error) {
      await db
        .update(checkoutSessions)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(checkoutSessions.id, checkoutSession.id));
      logger.error(
        {
          checkoutSessionId: checkoutSession.id,
          err: error,
          requestId: c.get("requestId"),
        },
        "checkout:stripe_session_create_failed"
      );
      throw error;
    }

    await db
      .update(checkoutSessions)
      .set({
        stripeCheckoutSessionId: stripeCheckoutSession.id,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, checkoutSession.id));

    return c.json(
      {
        checkoutSessionId: checkoutSession.id,
        checkoutUrl: stripeCheckoutSession.url,
        status: "pending_payment",
        stripeCheckoutSessionId: stripeCheckoutSession.id,
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
  .post("/webhook/stripe", handleStripeWebhook);
