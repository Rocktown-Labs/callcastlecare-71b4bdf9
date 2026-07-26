import { db } from "@callcastlecare/db";
import { homeQuotes, properties } from "@callcastlecare/db/schema/index";
import { Hono } from "hono";

import { getOrCreateCustomerForUser, requireUser } from "../lib/auth";
import { computeHomeQuotePricing } from "../lib/domain/home-quote";
import { verifyAddressWithRadar } from "../lib/integrations/radar";
import { lookupPropertyWithZillow } from "../lib/integrations/zillow";
import { createAddressRecord } from "../lib/orders";
import { publishOutboxEvent } from "../lib/outbox";
import type { AppEnv } from "../types";
import { homeQuoteRequestSchema } from "./schemas";

export const homeRoutes = new Hono<AppEnv>().post("/quotes", async (c) => {
  const userResult = requireUser(c);
  if (userResult.error) {
    return userResult.error;
  }

  const body = await c.req.json();
  const parsed = homeQuoteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const customer = await getOrCreateCustomerForUser(userResult.user);
  const verifiedAddress = await verifyAddressWithRadar(parsed.data.address);

  const address = await createAddressRecord({
    city: verifiedAddress.city,
    country: verifiedAddress.country,
    customerId: customer.id,
    latitude: verifiedAddress.latitude,
    longitude: verifiedAddress.longitude,
    radarGeocodeJson: verifiedAddress.raw,
    state: verifiedAddress.state,
    street: verifiedAddress.street,
    zip: verifiedAddress.zip,
  });

  const zillowData = await lookupPropertyWithZillow(parsed.data.address);
  const pricing = computeHomeQuotePricing(
    zillowData.homeSqft,
    zillowData.lotSizeSqft,
    zillowData.fallbackUsed
  );

  await db
    .insert(properties)
    .values({
      addressId: address.id,
      homeSqft: zillowData.homeSqft,
      lotSizeSqft: zillowData.lotSizeSqft,
      source: "zillow",
      zillowDataJson: zillowData.raw,
    })
    .onConflictDoUpdate({
      set: {
        homeSqft: zillowData.homeSqft,
        lotSizeSqft: zillowData.lotSizeSqft,
        updatedAt: new Date(),
        zillowDataJson: zillowData.raw,
      },
      target: properties.addressId,
    });

  const insertedQuotes = await db
    .insert(homeQuotes)
    .values({
      addressId: address.id,
      confidenceScore: pricing.confidenceScore,
      customerId: customer.id,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      fallbackUsed: zillowData.fallbackUsed,
      homeSqft: zillowData.homeSqft,
      lotSizeSqft: zillowData.lotSizeSqft,
      pricingTier: pricing.pricingTier,
      quotePayloadJson: {
        price: pricing.totalPriceCents,
        tier: pricing.pricingTier,
      },
      radarPayloadJson: verifiedAddress.raw,
      status: "ready",
      totalPriceCents: pricing.totalPriceCents,
      zillowPayloadJson: zillowData.raw,
    })
    .returning();

  const quote = insertedQuotes[0];
  if (!quote) {
    return c.json({ error: "Failed to create home quote" }, 500);
  }

  await publishOutboxEvent({
    eventName: "home_quote_ready",
    payload: {
      customerId: customer.id,
      homeQuoteId: quote.id,
    },
  });

  return c.json(
    {
      confidenceScore: pricing.confidenceScore,
      fallbackUsed: zillowData.fallbackUsed,
      homeQuoteId: quote.id,
      homeSqft: zillowData.homeSqft,
      lotSizeSqft: zillowData.lotSizeSqft,
      pricingTier: pricing.pricingTier,
      totalPriceCents: pricing.totalPriceCents,
    },
    200
  );
});
