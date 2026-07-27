import { Hono } from "hono";
import { z } from "zod";

import {
  autocompleteGoogleAddresses,
  validateGoogleAddress,
} from "../lib/integrations/google-maps";
import { lookupPropertyWithZillow } from "../lib/integrations/zillow";
import type { AppEnv } from "../types";

const autocompleteQuerySchema = z.object({
  input: z.string().trim().min(3),
});

const validateAddressSchema = z.object({
  address: z.string().trim().min(5),
});

export const locationRoutes = new Hono<AppEnv>()
  .get("/addresses/autocomplete", async (c) => {
    const parsed = autocompleteQuerySchema.safeParse({
      input: c.req.query("input"),
    });
    if (!parsed.success) {
      return c.json({ suggestions: [] }, 200);
    }

    const suggestions = await autocompleteGoogleAddresses(parsed.data.input);
    return c.json({ suggestions }, 200);
  })
  .post("/addresses/validate", async (c) => {
    const body = await c.req.json();
    const parsed = validateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const [address, property] = await Promise.all([
      validateGoogleAddress(parsed.data.address),
      lookupPropertyWithZillow(parsed.data.address),
    ]);

    return c.json({ address, property }, 200);
  });
