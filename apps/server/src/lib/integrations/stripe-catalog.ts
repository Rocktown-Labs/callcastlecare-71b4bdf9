import {
  defaultStripeCatalogItems,
  defaultStripeCoupons,
  type StripeCatalogItemInput,
  type StripeCouponInput,
} from "@callcastlecare/api";
import { env } from "@callcastlecare/env/server";
import Stripe from "stripe";

const stripeMetadataKey = "castlecare_slug";

export const getDefaultStripeCatalog = () => ({
  coupons: [...defaultStripeCoupons],
  items: [...defaultStripeCatalogItems],
});

export const createStripeClientOrThrow = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required to sync Stripe catalog.");
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
};

const findProductBySlug = async (stripe: Stripe, slug: string) => {
  for await (const product of stripe.products.list({ limit: 100 })) {
    if (product.metadata?.[stripeMetadataKey] === slug) {
      return product;
    }
  }

  return null;
};

const findPriceForItem = async (
  stripe: Stripe,
  input: StripeCatalogItemInput,
  productId: string
) => {
  for await (const price of stripe.prices.list({
    active: input.active,
    limit: 100,
    product: productId,
  })) {
    const sameAmount = price.unit_amount === input.amountCents;
    const sameCurrency = price.currency === input.currency;
    const expectedInterval =
      input.interval === "one_time" ? undefined : input.interval;
    const sameInterval = price.recurring?.interval === expectedInterval;

    if (sameAmount && sameCurrency && sameInterval) {
      return price;
    }
  }

  return null;
};

export const syncStripeCatalogItem = async (
  stripe: Stripe,
  input: StripeCatalogItemInput
) => {
  const existingProduct = await findProductBySlug(stripe, input.slug);
  const product = existingProduct
    ? await stripe.products.update(existingProduct.id, {
        active: input.active,
        description: input.description,
        metadata: {
          [stripeMetadataKey]: input.slug,
          serviceType: input.serviceType,
        },
        name: input.name,
      })
    : await stripe.products.create({
        active: input.active,
        description: input.description,
        metadata: {
          [stripeMetadataKey]: input.slug,
          serviceType: input.serviceType,
        },
        name: input.name,
      });

  const existingPrice = await findPriceForItem(stripe, input, product.id);
  const price =
    existingPrice ??
    (await stripe.prices.create({
      active: input.active,
      currency: input.currency,
      metadata: {
        [stripeMetadataKey]: input.slug,
        serviceType: input.serviceType,
      },
      product: product.id,
      recurring:
        input.interval === "one_time" ? undefined : { interval: input.interval },
      unit_amount: input.amountCents,
    }));

  await stripe.products.update(product.id, {
    default_price: price.id,
  });

  return {
    stripePriceId: price.id,
    stripeProductId: product.id,
  };
};

export const syncStripeCoupon = async (
  stripe: Stripe,
  input: StripeCouponInput
) => {
  const requestedId = input.code.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const existing = await stripe.coupons.retrieve(requestedId).catch(() => null);

  if (existing && !existing.deleted) {
    const updated = await stripe.coupons.update(existing.id, {
      metadata: {
        code: input.code,
        name: input.name,
      },
      name: input.name,
    });

    return { stripeCouponId: updated.id };
  }

  const created = await stripe.coupons.create({
    amount_off: input.amountOffCents ?? undefined,
    currency: input.amountOffCents ? input.currency : undefined,
    duration: input.duration,
    duration_in_months:
      input.duration === "repeating"
        ? (input.durationInMonths ?? undefined)
        : undefined,
    id: requestedId,
    metadata: {
      code: input.code,
      name: input.name,
    },
    name: input.name,
    percent_off: input.percentOff ?? undefined,
  });

  return { stripeCouponId: created.id };
};

export const ensureStripeWebhookEndpoint = async (stripe: Stripe) => {
  if (!env.STRIPE_WEBHOOK_PUBLIC_URL) {
    return null;
  }

  for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (endpoint.url === env.STRIPE_WEBHOOK_PUBLIC_URL) {
      return endpoint.id;
    }
  }

  const endpoint = await stripe.webhookEndpoints.create({
    enabled_events: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.deleted",
      "customer.subscription.updated",
      "invoice.payment_failed",
      "invoice.payment_succeeded",
      "payment_intent.succeeded",
    ],
    url: env.STRIPE_WEBHOOK_PUBLIC_URL,
  });

  return endpoint.id;
};
