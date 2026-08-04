/* eslint-disable complexity */
import { db, and, eq } from "@callcastlecare/db";
import { addresses } from "@callcastlecare/db/schema/index";
import { Hono } from "hono";

import { getOrCreateCustomerForUser, requireUser } from "../lib/auth";
import { verifyAddressWithRadar } from "../lib/integrations/radar";
import { createAddressRecord } from "../lib/orders";
import type { AppEnv } from "../types";
import {
  updateAddressRequestSchema,
  upsertAddressRequestSchema,
} from "./schemas";

const parseAddressId = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildFormattedAddress = (input: {
  city: string;
  country: string;
  state: string;
  street: string;
  zip: string;
}) =>
  `${input.street}, ${input.city}, ${input.state} ${input.zip}, ${input.country}`;

export const addressesRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    let list: unknown[] = [];
    try {
      list = await db.query.addresses.findMany({
        orderBy: (table, { desc }) => [
          desc(table.isDefault),
          desc(table.updatedAt),
        ],
        where: eq(addresses.customerId, customer.id),
      });
    } catch {
      list = await db
        .select({
          city: addresses.city,
          country: addresses.country,
          createdAt: addresses.createdAt,
          customerId: addresses.customerId,
          id: addresses.id,
          latitude: addresses.latitude,
          longitude: addresses.longitude,
          state: addresses.state,
          street: addresses.street,
          updatedAt: addresses.updatedAt,
          zip: addresses.zip,
        })
        .from(addresses)
        .where(eq(addresses.customerId, customer.id));
    }

    return c.json({ addresses: list }, 200);
  })
  .post("/", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const body = await c.req.json();
    const parsed = upsertAddressRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const payload = parsed.data;

    if (payload.address) {
      let verified: {
        city: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        raw: Record<string, unknown>;
        state: string;
        street: string;
        zip: string;
      };

      try {
        verified = await verifyAddressWithRadar(payload.address);
      } catch {
        const parts = payload.address.split(",").map((p) => p.trim());
        verified = {
          city: parts[1] ?? payload.city ?? "Little Rock",
          country: payload.country ?? "US",
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          raw: { source: "manual-autocomplete-fallback" },
          state: parts[2]?.split(" ")[0] ?? payload.state ?? "AR",
          street: parts[0] ?? payload.street ?? payload.address,
          zip: parts[2]?.split(" ")[1] ?? payload.zip ?? "72201",
        };
      }

      const address = await createAddressRecord({
        city: verified.city,
        country: verified.country,
        customerId: customer.id,
        formattedAddress: payload.formattedAddress ?? payload.address,
        instructions: payload.instructions ?? null,
        isDefault: payload.isDefault,
        label: payload.label,
        latitude: payload.latitude ?? verified.latitude,
        longitude: payload.longitude ?? verified.longitude,
        radarGeocodeJson: verified.raw,
        state: verified.state,
        street: verified.street,
        zip: verified.zip,
      });

      return c.json({ address }, 200);
    }

    const { city } = payload;
    const { state } = payload;
    const { street } = payload;
    const { zip } = payload;

    if (!city || !state || !street || !zip) {
      return c.json({ error: "Invalid structured address" }, 400);
    }

    const country = payload.country ?? "US";
    const address = await createAddressRecord({
      city,
      country,
      customerId: customer.id,
      formattedAddress:
        payload.formattedAddress ??
        buildFormattedAddress({
          city,
          country,
          state,
          street,
          zip,
        }),
      instructions: payload.instructions ?? null,
      isDefault: payload.isDefault,
      label: payload.label,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      radarGeocodeJson: {
        source: "manual",
      },
      state,
      street,
      zip,
    });

    return c.json({ address }, 200);
  })
  .patch("/:addressId", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const addressId = parseAddressId(c.req.param("addressId"));
    if (!addressId) {
      return c.json({ error: "Invalid address id" }, 400);
    }

    const body = await c.req.json();
    const parsed = updateAddressRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const target = await db.query.addresses.findFirst({
      where: and(
        eq(addresses.id, addressId),
        eq(addresses.customerId, customer.id)
      ),
    });

    if (!target) {
      return c.json({ error: "Address not found" }, 404);
    }

    const updated = await db.transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx
          .update(addresses)
          .set({
            isDefault: false,
            updatedAt: new Date(),
          })
          .where(eq(addresses.customerId, customer.id));
      }

      const updatedRows = await tx
        .update(addresses)
        .set({
          ...(parsed.data.instructions === undefined
            ? {}
            : { instructions: parsed.data.instructions }),
          ...(parsed.data.isDefault === undefined
            ? {}
            : { isDefault: parsed.data.isDefault }),
          ...(parsed.data.label ? { label: parsed.data.label } : {}),
          updatedAt: new Date(),
        })
        .where(eq(addresses.id, target.id))
        .returning();

      return updatedRows[0];
    });

    if (!updated) {
      return c.json({ error: "Failed to update address" }, 500);
    }

    return c.json({ address: updated }, 200);
  })
  .post("/:addressId/default", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const addressId = parseAddressId(c.req.param("addressId"));
    if (!addressId) {
      return c.json({ error: "Invalid address id" }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const target = await db.query.addresses.findFirst({
      where: and(
        eq(addresses.id, addressId),
        eq(addresses.customerId, customer.id)
      ),
    });

    if (!target) {
      return c.json({ error: "Address not found" }, 404);
    }

    const updated = await db.transaction(async (tx) => {
      await tx
        .update(addresses)
        .set({
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(eq(addresses.customerId, customer.id));

      const updatedRows = await tx
        .update(addresses)
        .set({
          isDefault: true,
          updatedAt: new Date(),
        })
        .where(eq(addresses.id, target.id))
        .returning();

      return updatedRows[0];
    });

    if (!updated) {
      return c.json({ error: "Failed to set default address" }, 500);
    }

    return c.json({ address: updated }, 200);
  })
  .delete("/:addressId", async (c) => {
    const userResult = requireUser(c);
    if (userResult.error) {
      return userResult.error;
    }

    const addressId = parseAddressId(c.req.param("addressId"));
    if (!addressId) {
      return c.json({ error: "Invalid address id" }, 400);
    }

    const customer = await getOrCreateCustomerForUser(userResult.user);
    const target = await db.query.addresses.findFirst({
      where: and(
        eq(addresses.id, addressId),
        eq(addresses.customerId, customer.id)
      ),
    });

    if (!target) {
      return c.json({ error: "Address not found" }, 404);
    }

    await db.delete(addresses).where(eq(addresses.id, target.id));
    return c.json({ success: true }, 200);
  });
