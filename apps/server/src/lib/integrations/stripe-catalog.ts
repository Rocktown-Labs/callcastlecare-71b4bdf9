import {
  defaultStripeCatalogItems,
  defaultStripeCoupons,
  getStripeCatalogProductKey,
  getStripeCatalogProductName,
} from "@callcastlecare/api";
import type {
  StripeCatalogItemInput,
  StripeCouponInput,
} from "@callcastlecare/api";
import { env } from "@callcastlecare/env/server";
import type Stripe from "stripe";

import {
  getStripeClient,
  getStripeMode,
  getStripeRequestOptions,
  getStripeWebhookUrl,
  requireStripeClient,
} from "./stripe-client";
import type { StripeWebhookEndpointKind } from "./stripe-client";

const stripeMetadataKey = "app_plan_code";

type StripeSyncStatus = "created" | "matched" | "updated";

export interface StripeCatalogSyncResult {
  lookupKey: string;
  status: StripeSyncStatus;
  stripePriceId: string;
  stripeProductId: string;
}

export interface StripeWebhookSyncResult {
  connect: boolean;
  endpointId: string;
  kind: StripeWebhookEndpointKind;
  secret: string | null;
  status: "created" | "enabled" | "missing" | "unconfigured" | "updated";
  url: string;
}

const webhookDefinitions = [
  {
    connect: false,
    events: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.deleted",
      "customer.subscription.updated",
      "invoice.payment_failed",
      "invoice.paid",
    ],
    kind: "billing",
  },
  {
    connect: false,
    events: [
      "checkout.session.async_payment_failed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.completed",
      "checkout.session.expired",
      "charge.dispute.created",
      "charge.refunded",
      "refund.created",
      "payment_intent.succeeded",
    ],
    kind: "commerce",
  },
  {
    connect: true,
    events: [
      "account.application.deauthorized",
      "account.updated",
      "capability.updated",
      "payout.failed",
      "payout.paid",
    ],
    kind: "connect",
  },
] as const satisfies readonly {
  connect: boolean;
  events: readonly string[];
  kind: StripeWebhookEndpointKind;
}[];

export const getDefaultStripeCatalog = () => ({
  coupons: [...defaultStripeCoupons],
  items: [...defaultStripeCatalogItems],
});

export const createStripeClientOrThrow = () => requireStripeClient();

const findProductByPlanCode = async (stripe: Stripe, planCode: string) => {
  const [activeProducts, inactiveProducts] = await Promise.all([
    stripe.products.list({ active: true, limit: 100 }),
    stripe.products.list({ active: false, limit: 100 }),
  ]);
  return (
    [...activeProducts.data, ...inactiveProducts.data].find(
      (product) =>
        product.metadata?.[stripeMetadataKey] === planCode ||
        product.metadata?.castlecare_slug === planCode
    ) ?? null
  );
};

const findPriceForItem = async (
  stripe: Stripe,
  input: StripeCatalogItemInput,
  productId: string,
  lookupKey: string
) => {
  const prices = await stripe.prices.list({
    limit: 100,
    product: productId,
  });
  for (const price of prices.data) {
    const sameAmount = price.unit_amount === input.amountCents;
    const sameCurrency = price.currency === input.currency;
    const expectedInterval =
      input.interval === "one_time" ? undefined : input.interval;
    const sameInterval = price.recurring?.interval === expectedInterval;
    const sameLookupKey = price.lookup_key === lookupKey;

    if (sameAmount && sameCurrency && sameInterval && sameLookupKey) {
      return { price, stalePrice: null, status: "matched" as const };
    }
    if (sameLookupKey && sameCurrency && sameInterval) {
      return { price: null, stalePrice: price, status: "updated" as const };
    }
  }

  return { price: null, stalePrice: null, status: "created" as const };
};

const createPrice = (
  stripe: Stripe,
  input: StripeCatalogItemInput,
  productId: string,
  lookupKey: string
) => {
  const requestOptions = getStripeRequestOptions(
    "catalog-price",
    lookupKey,
    String(input.amountCents)
  );

  return stripe.prices.create(
    {
      active: input.active,
      currency: input.currency,
      lookup_key: lookupKey,
      metadata: {
        [stripeMetadataKey]: input.slug,
        castlecare_product_key: getStripeCatalogProductKey(input),
        serviceType: input.serviceType,
      },
      product: productId,
      recurring:
        input.interval === "one_time"
          ? undefined
          : { interval: input.interval },
      unit_amount: input.amountCents,
    },
    requestOptions
  );
};

export const syncStripeCatalogItem = async (
  stripe: Stripe,
  input: StripeCatalogItemInput
): Promise<StripeCatalogSyncResult> => {
  const productKey = getStripeCatalogProductKey(input);
  const lookupKey = `castlecare_${input.slug}`;
  const productName = getStripeCatalogProductName(input);
  const existingProduct = await findProductByPlanCode(stripe, productKey);
  const product = existingProduct
    ? await stripe.products.update(existingProduct.id, {
        active: input.active,
        description: input.description,
        metadata: {
          ...existingProduct.metadata,
          [stripeMetadataKey]: productKey,
          castlecare_product_key: productKey,
          serviceType: input.serviceType,
        },
        name: productName,
      })
    : await stripe.products.create(
        {
          active: input.active,
          description: input.description,
          metadata: {
            [stripeMetadataKey]: productKey,
            castlecare_product_key: productKey,
            serviceType: input.serviceType,
          },
          name: productName,
        },
        getStripeRequestOptions("catalog-product", productKey)
      );

  const existingPrice = await findPriceForItem(
    stripe,
    input,
    product.id,
    lookupKey
  );
  let { price } = existingPrice;
  let priceStatus: StripeSyncStatus = existingPrice.status;

  if (!price) {
    if (existingPrice.stalePrice) {
      await stripe.prices.update(existingPrice.stalePrice.id, {
        active: false,
      });
    }
    try {
      price = await createPrice(stripe, input, product.id, lookupKey);
    } catch (error) {
      if (existingPrice.stalePrice) {
        await stripe.prices.update(existingPrice.stalePrice.id, {
          active: true,
        });
      }
      throw error;
    }
    priceStatus = existingPrice.stalePrice ? "updated" : "created";
  } else if (price.active !== input.active) {
    price = await stripe.prices.update(price.id, { active: input.active });
    priceStatus = "updated";
  }

  if (product.default_price !== price.id) {
    await stripe.products.update(product.id, {
      default_price: price.id,
    });
    priceStatus = priceStatus === "matched" ? "updated" : priceStatus;
  }

  const status: StripeSyncStatus = existingProduct ? priceStatus : "created";

  return {
    lookupKey,
    status,
    stripePriceId: price.id,
    stripeProductId: product.id,
  };
};

export const syncStripeCoupon = async (
  stripe: Stripe,
  input: StripeCouponInput
) => {
  const requestedId = input.code.toLowerCase().replaceAll(/[^a-z0-9_-]/gu, "-");
  const existing = await stripe.coupons.retrieve(requestedId).catch(() => null);

  if (existing && !existing.deleted) {
    const updated = await stripe.coupons.update(existing.id, {
      metadata: {
        code: input.code,
        name: input.name,
      },
      name: input.name,
    });

    return { status: "matched" as const, stripeCouponId: updated.id };
  }

  const created = await stripe.coupons.create(
    {
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
    },
    getStripeRequestOptions("catalog-coupon", requestedId)
  );

  return { status: "created" as const, stripeCouponId: created.id };
};

const hasSameEvents = (
  actual: readonly string[],
  expected: readonly string[]
) => {
  const actualEvents = new Set(actual);
  return (
    actualEvents.size === expected.length &&
    expected.every((event) => actualEvents.has(event))
  );
};

export const ensureStripeWebhookEndpoints = async (stripe: Stripe) => {
  const endpointList = await stripe.webhookEndpoints.list({ limit: 100 });
  const existingEndpoints = endpointList.data;

  return Promise.all(
    webhookDefinitions.map(
      async (definition): Promise<StripeWebhookSyncResult> => {
        const url = getStripeWebhookUrl(definition.kind);
        if (!url) {
          return {
            connect: definition.connect,
            endpointId: "",
            kind: definition.kind,
            secret: null,
            status: "unconfigured",
            url: "",
          };
        }

        const existingEndpoint = existingEndpoints.find(
          (endpoint) =>
            endpoint.url === url &&
            (endpoint.metadata?.castlecare_endpoint_kind === definition.kind ||
              (definition.kind === "commerce" &&
                !endpoint.metadata?.castlecare_endpoint_kind))
        );
        const enabledEvents = [...definition.events];
        if (!existingEndpoint) {
          const endpoint = await stripe.webhookEndpoints.create(
            {
              connect: definition.connect,
              enabled_events: enabledEvents,
              metadata: {
                castlecare_endpoint_kind: definition.kind,
              },
              url,
            },
            getStripeRequestOptions("webhook-endpoint", definition.kind, url)
          );
          return {
            connect: definition.connect,
            endpointId: endpoint.id,
            kind: definition.kind,
            secret: endpoint.secret ?? null,
            status: "created",
            url,
          };
        }

        const needsUpdate = !hasSameEvents(
          existingEndpoint.enabled_events,
          enabledEvents
        );
        if (needsUpdate) {
          await stripe.webhookEndpoints.update(existingEndpoint.id, {
            enabled_events: enabledEvents,
          });
        }

        return {
          connect: definition.connect,
          endpointId: existingEndpoint.id,
          kind: definition.kind,
          secret: null,
          status: needsUpdate ? "updated" : "enabled",
          url,
        };
      }
    )
  );
};

const isWebhookSecretConfigured = (kind: StripeWebhookEndpointKind) => {
  if (kind === "billing") {
    return Boolean(
      env.STRIPE_BILLING_WEBHOOK_SECRET ?? env.STRIPE_WEBHOOK_SECRET
    );
  }
  if (kind === "commerce") {
    return Boolean(
      env.STRIPE_COMMERCE_WEBHOOK_SECRET ?? env.STRIPE_WEBHOOK_SECRET
    );
  }
  return Boolean(env.STRIPE_CONNECT_WEBHOOK_SECRET);
};

const getWebhookStatus = (
  endpoint: Stripe.WebhookEndpoint | undefined,
  url: string | null
) => {
  if (!url) {
    return "unconfigured" as const;
  }
  if (!endpoint) {
    return "missing" as const;
  }
  return endpoint.status === "enabled"
    ? ("enabled" as const)
    : ("missing" as const);
};

export const getStripeIntegrationStatus = async () => {
  const stripe = getStripeClient();

  if (!stripe) {
    return {
      configured: false,
      mode: env.STRIPE_SECRET_KEY ? getStripeMode() : null,
      webhookEndpoints: webhookDefinitions.map((definition) => ({
        connect: definition.connect,
        endpointId: "",
        kind: definition.kind,
        secretConfigured: false,
        status: getWebhookStatus(
          undefined,
          getStripeWebhookUrl(definition.kind)
        ),
        url: getStripeWebhookUrl(definition.kind) ?? "",
      })),
    };
  }

  const endpointList = await stripe.webhookEndpoints.list({ limit: 100 });
  const existingEndpoints = endpointList.data;

  return {
    configured: true,
    mode: getStripeMode(),
    webhookEndpoints: webhookDefinitions.map((definition) => {
      const url = getStripeWebhookUrl(definition.kind);
      const endpoint = existingEndpoints.find(
        (candidate) =>
          candidate.url === url &&
          (candidate.metadata?.castlecare_endpoint_kind === definition.kind ||
            (definition.kind === "commerce" &&
              !candidate.metadata?.castlecare_endpoint_kind))
      );
      return {
        connect: definition.connect,
        endpointId: endpoint?.id ?? "",
        kind: definition.kind,
        secretConfigured: isWebhookSecretConfigured(definition.kind),
        status: getWebhookStatus(endpoint, url),
        url: url ?? "",
      };
    }),
  };
};
