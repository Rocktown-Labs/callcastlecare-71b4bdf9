import { db, eq } from "@callcastlecare/db";
import { user as authUsers } from "@callcastlecare/db/schema/index";
import type Stripe from "stripe";

import { logger } from "../logger";
import {
  getStripeClient,
  getStripeMode,
  getStripeRequestOptions,
  getStripeWebhookSecret,
  isStripeMockMode,
} from "./stripe-client";
import type { StripeWebhookEndpointKind } from "./stripe-client";

export interface StripePaymentIntent {
  clientSecret: string;
  id: string;
}

export interface CastleCareCheckoutLineItem {
  amountCents?: number;
  currency?: string;
  description?: string;
  name: string;
  priceId?: string;
  quantity?: number;
}

export interface CastleCareCheckoutSession {
  id: string;
  mode: "payment" | "subscription";
  subscriptionId?: string | null;
  url: string;
}

export interface StripeWebhookEvent {
  data: {
    object: Record<string, unknown>;
  };
  id: string;
  type: string;
}

const createMockPaymentIntent = (amountCents: number): StripePaymentIntent => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Stripe is not configured for production payments.");
  }

  const random = Math.random().toString(36).slice(2);
  return {
    clientSecret: `mock_pi_client_secret_${random}`,
    id: `mock_pi_${amountCents}_${random}`,
  };
};

const getStripeLineItems = (
  input: CastleCareCheckoutLineItem[] | undefined,
  fallbackAmountCents: number,
  fallbackCurrency: string
): Stripe.Checkout.SessionCreateParams.LineItem[] => {
  const items = input ?? [
    {
      amountCents: fallbackAmountCents,
      currency: fallbackCurrency,
      description: "Secure payment for your CastleCare booking.",
      name: "CastleCare reservation",
    },
  ];

  return items.map((item) => ({
    ...(item.priceId
      ? { price: item.priceId }
      : {
          price_data: {
            currency: item.currency ?? fallbackCurrency,
            product_data: {
              description: item.description,
              name: item.name,
            },
            unit_amount: item.amountCents ?? 0,
          },
        }),
    quantity: item.quantity ?? 1,
  }));
};

export const getOrCreateStripeCustomer = async (input: {
  email: string;
  name: string;
  userId: string;
}) => {
  if (isStripeMockMode()) {
    return null;
  }

  const stripeClient = getStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe client is unavailable.");
  }

  const existingUser = await db.query.user.findFirst({
    columns: { stripeCustomerId: true },
    where: eq(authUsers.id, input.userId),
  });
  if (existingUser?.stripeCustomerId) {
    const stripeCustomer = await stripeClient.customers
      .retrieve(existingUser.stripeCustomerId)
      .catch(() => null);
    if (
      stripeCustomer &&
      !("deleted" in stripeCustomer) &&
      stripeCustomer.livemode === (getStripeMode() === "live")
    ) {
      return existingUser.stripeCustomerId;
    }
  }

  const customer = await stripeClient.customers.create(
    {
      email: input.email,
      metadata: {
        castlecareUserId: input.userId,
      },
      name: input.name,
    },
    getStripeRequestOptions("customer", input.userId)
  );

  await db
    .update(authUsers)
    .set({
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, input.userId));

  return customer.id;
};

export const retrieveStripeSubscription = (subscriptionId: string) => {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    return null;
  }
  return stripeClient.subscriptions.retrieve(subscriptionId);
};

export const createStripePaymentIntent = async (input: {
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<StripePaymentIntent> => {
  if (isStripeMockMode()) {
    return createMockPaymentIntent(input.amountCents);
  }

  const stripeClient = getStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe client is unavailable.");
  }

  try {
    const paymentIntent = await stripeClient.paymentIntents.create(
      {
        amount: input.amountCents,
        automatic_payment_methods: {
          enabled: true,
        },
        currency: input.currency ?? "usd",
        metadata: input.metadata,
      },
      getStripeRequestOptions(
        "payment-intent",
        input.metadata?.checkoutSessionId ?? "unknown"
      )
    );

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    };
  } catch (error) {
    logger.error(
      {
        amountCents: input.amountCents,
        error,
      },
      "stripe_payment_intent:create_failed"
    );
    throw error;
  }
};

export const createStripeCheckoutSession = async (input: {
  amountDueCents: number;
  cancelUrl: string;
  checkoutSessionId: number;
  currency?: string;
  customerEmail: string;
  expiresAt?: Date;
  idempotencyKey?: string;
  lineItems?: CastleCareCheckoutLineItem[];
  metadata: Record<string, string>;
  mode?: "payment" | "subscription";
  stripeCustomerId?: string | null;
  subscriptionMetadata?: Record<string, string>;
  successUrl: string;
}): Promise<CastleCareCheckoutSession> => {
  const mode = input.mode ?? "payment";

  if (isStripeMockMode()) {
    const random = Math.random().toString(36).slice(2);
    return {
      id: `cs_mock_${input.checkoutSessionId}_${random}`,
      mode,
      subscriptionId: mode === "subscription" ? `sub_mock_${random}` : null,
      url: `${input.successUrl.replace("{CHECKOUT_SESSION_ID}", `cs_mock_${random}`)}`,
    };
  }

  const stripeClient = getStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe client is unavailable.");
  }

  const currency = input.currency ?? "usd";
  const integrationIdentifier = `castlecare_${Math.random().toString(36).slice(2, 10)}`;
  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    cancel_url: input.cancelUrl,
    ...(input.expiresAt
      ? { expires_at: Math.floor(input.expiresAt.getTime() / 1000) }
      : {}),
    ...(input.stripeCustomerId
      ? { customer: input.stripeCustomerId }
      : { customer_email: input.customerEmail }),
    integration_identifier: integrationIdentifier,
    line_items: getStripeLineItems(
      input.lineItems,
      input.amountDueCents,
      currency
    ),
    metadata: input.metadata,
    mode,
    ...(mode === "payment"
      ? {
          payment_intent_data: {
            metadata: input.metadata,
          },
        }
      : {
          subscription_data: {
            metadata: input.subscriptionMetadata ?? input.metadata,
          },
        }),
    success_url: input.successUrl,
  };

  const session = await stripeClient.checkout.sessions.create(
    checkoutParams,
    input.idempotencyKey
      ? { idempotencyKey: input.idempotencyKey }
      : getStripeRequestOptions(
          "checkout-session",
          String(input.checkoutSessionId)
        )
  );

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  return {
    id: session.id,
    mode,
    subscriptionId:
      typeof session.subscription === "string" ? session.subscription : null,
    url: session.url,
  };
};

export const parseStripeWebhookEvent = (input: {
  endpointKind?: StripeWebhookEndpointKind;
  rawBody: string;
  signatureHeader: string | undefined;
}): StripeWebhookEvent | null => {
  const endpointKind = input.endpointKind ?? "commerce";
  const webhookSecret = getStripeWebhookSecret(endpointKind);

  if (isStripeMockMode()) {
    try {
      return JSON.parse(input.rawBody) as StripeWebhookEvent;
    } catch {
      return null;
    }
  }

  if (!(input.signatureHeader && webhookSecret)) {
    return null;
  }

  const stripeClient = getStripeClient();
  if (!stripeClient) {
    return null;
  }

  try {
    const event = stripeClient.webhooks.constructEvent(
      input.rawBody,
      input.signatureHeader,
      webhookSecret
    );

    return event as unknown as StripeWebhookEvent;
  } catch (error) {
    logger.error(
      { endpointKind, error },
      "stripe_webhook:signature_verification_failed"
    );
    return null;
  }
};
