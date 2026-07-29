import { env } from "@callcastlecare/env/server";
import Stripe from "stripe";

import { logger } from "../logger";

export interface StripePaymentIntent {
  clientSecret: string;
  id: string;
}

export interface CastleCareCheckoutSession {
  id: string;
  url: string;
}

export interface StripeWebhookEvent {
  data: {
    object: Record<string, unknown>;
  };
  id: string;
  type: string;
}

const createStripeClient = () => {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia" as Stripe.StripeConfig["apiVersion"],
  });
};

const createMockPaymentIntent = (amountCents: number): StripePaymentIntent => {
  if (env.NODE_ENV === "production") {
    throw new Error("Stripe is not configured for production payments.");
  }

  const random = Math.random().toString(36).slice(2);
  return {
    clientSecret: `mock_pi_client_secret_${random}`,
    id: `mock_pi_${amountCents}_${random}`,
  };
};

const shouldUseMockMode = () =>
  !env.STRIPE_SECRET_KEY ||
  env.STRIPE_SECRET_KEY.includes("replace_me") ||
  env.STRIPE_SECRET_KEY.startsWith("sk_test_replace");

export const createStripePaymentIntent = async (input: {
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<StripePaymentIntent> => {
  if (shouldUseMockMode()) {
    return createMockPaymentIntent(input.amountCents);
  }

  const stripeClient = createStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe client is unavailable.");
  }

  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: input.amountCents,
      automatic_payment_methods: {
        enabled: true,
      },
      currency: input.currency ?? "usd",
      metadata: input.metadata,
    });

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

const randomLetters = (length: number) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
};

export const createStripeCheckoutSession = async (input: {
  amountDueCents: number;
  cancelUrl: string;
  checkoutSessionId: number;
  currency?: string;
  customerEmail: string;
  metadata: Record<string, string>;
  successUrl: string;
}): Promise<CastleCareCheckoutSession> => {
  if (shouldUseMockMode()) {
    const random = Math.random().toString(36).slice(2);
    return {
      id: `cs_mock_${input.checkoutSessionId}_${random}`,
      url: `${input.successUrl.replace("{CHECKOUT_SESSION_ID}", `cs_mock_${random}`)}`,
    };
  }

  const stripeClient = createStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe client is unavailable.");
  }

  const checkoutParams = {
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    integration_identifier: `castlecare_hosted_${randomLetters(8)}`,
    line_items: [
      {
        price_data: {
          currency: input.currency ?? "usd",
          product_data: {
            description: "Secure payment for your CastleCare booking.",
            name: "CastleCare reservation",
          },
          unit_amount: input.amountDueCents,
        },
        quantity: 1,
      },
    ],
    metadata: input.metadata,
    mode: "payment",
    payment_intent_data: {
      metadata: input.metadata,
    },
    success_url: input.successUrl,
  } satisfies Stripe.Checkout.SessionCreateParams & {
    integration_identifier: string;
  };

  const session = await stripeClient.checkout.sessions.create(checkoutParams);

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  return {
    id: session.id,
    url: session.url,
  };
};

export const parseStripeWebhookEvent = (input: {
  rawBody: string;
  signatureHeader: string | undefined;
}): StripeWebhookEvent | null => {
  if (shouldUseMockMode()) {
    try {
      return JSON.parse(input.rawBody) as StripeWebhookEvent;
    } catch {
      return null;
    }
  }

  if (!input.signatureHeader) {
    return null;
  }

  const stripeClient = createStripeClient();
  if (!stripeClient) {
    return null;
  }

  try {
    const event = stripeClient.webhooks.constructEvent(
      input.rawBody,
      input.signatureHeader,
      env.STRIPE_WEBHOOK_SECRET ?? ""
    );

    return event as unknown as StripeWebhookEvent;
  } catch (error) {
    logger.error({ error }, "stripe_webhook:signature_verification_failed");
    return null;
  }
};
