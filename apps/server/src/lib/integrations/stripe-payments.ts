import { env } from "@callcastlecare/env/server";
import Stripe from "stripe";

import { logger } from "../logger";

export interface StripePaymentIntent {
  clientSecret: string;
  id: string;
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
    apiVersion: "2026-02-25.clover",
  });
};

const createMockPaymentIntent = (amountCents: number): StripePaymentIntent => {
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
    return createMockPaymentIntent(input.amountCents);
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
      return createMockPaymentIntent(input.amountCents);
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
    return createMockPaymentIntent(input.amountCents);
  }
};

export const parseStripeWebhookEvent = async (input: {
  rawBody: string;
  signatureHeader: string | undefined;
}): Promise<StripeWebhookEvent | null> => {
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
