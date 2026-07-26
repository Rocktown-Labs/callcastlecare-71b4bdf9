import { env } from "@callcastlecare/env/server";
import Stripe from "stripe";

import { logger } from "../logger";

const createStripeClient = () => {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
};

export const releaseWorkerPayout = async (input: {
  amountCents: number;
  currency?: string;
  workerStripeAccountId: string;
}) => {
  const stripeClient = createStripeClient();
  if (!stripeClient) {
    logger.info(
      {
        amountCents: input.amountCents,
        workerStripeAccountId: input.workerStripeAccountId,
      },
      "stripe_connect:transfer_skipped:no_secret_key"
    );

    return {
      providerPayoutId: null,
      success: false,
    } as const;
  }

  try {
    const transfer = await stripeClient.transfers.create({
      amount: input.amountCents,
      currency: input.currency ?? "usd",
      destination: input.workerStripeAccountId,
    });

    return {
      providerPayoutId: transfer.id,
      success: true,
    } as const;
  } catch (error) {
    logger.error(
      {
        amountCents: input.amountCents,
        error,
        workerStripeAccountId: input.workerStripeAccountId,
      },
      "stripe_connect:transfer_failed"
    );

    return {
      providerPayoutId: null,
      success: false,
    } as const;
  }
};
