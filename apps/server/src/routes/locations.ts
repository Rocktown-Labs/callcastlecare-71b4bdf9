import {
  bookingTimeSlots,
  buildTravelEstimate,
  getAvailableBookingTimeSlots,
  getBookingDateRange,
  getBookingZoneHour,
  getSlotStartHour,
} from "@callcastlecare/api";
import type { BookingTimeSlot } from "@callcastlecare/api";
import { and, db, eq, gt, gte, inArray, lt } from "@callcastlecare/db";
import {
  checkoutItems,
  checkoutSessions,
  markets,
  orders,
} from "@callcastlecare/db/schema/index";
import { Hono } from "hono";
import { z } from "zod";

import {
  autocompleteRadarAddresses,
  reverseGeocodeWithRadar,
  validateRadarAddress,
} from "../lib/integrations/radar";
import { lookupPropertyWithRentCast } from "../lib/integrations/rentcast";
import { logger } from "../lib/logger";
import type { AppEnv } from "../types";

const autocompleteQuerySchema = z.object({
  input: z.string().trim().min(5),
});

const validateAddressSchema = z.object({
  address: z.string().trim().min(5),
  includeProperty: z.boolean().optional().default(false),
});

const reverseGeocodeSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  driveMinutes: z.coerce
    .number()
    .min(0)
    .max(24 * 60)
    .optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  stateCode: z.string().trim().min(2).max(2).optional(),
});

const activeOrderStatuses = [
  "pending_payment",
  "paid",
  "dispatching",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
] as const;

const getBookedSlots = async (date: string) => {
  const { endsAt, startsAt } = getBookingDateRange(date);
  const holdCutoff = new Date(Date.now() - 30 * 60 * 1000);
  const [bookedOrders, heldCheckouts] = await Promise.all([
    db.query.orders.findMany({
      columns: {
        scheduledStartAt: true,
      },
      where: and(
        gte(orders.scheduledStartAt, startsAt),
        lt(orders.scheduledStartAt, endsAt),
        inArray(orders.status, activeOrderStatuses)
      ),
    }),
    db
      .select({ scheduledStartAt: checkoutItems.scheduledStartAt })
      .from(checkoutItems)
      .innerJoin(
        checkoutSessions,
        eq(checkoutItems.checkoutSessionId, checkoutSessions.id)
      )
      .where(
        and(
          inArray(checkoutSessions.status, ["pending_payment", "paid"]),
          gt(checkoutSessions.updatedAt, holdCutoff),
          gte(checkoutItems.scheduledStartAt, startsAt),
          lt(checkoutItems.scheduledStartAt, endsAt)
        )
      )
      .limit(100),
  ]);

  const bookedStartHours = new Set(
    [...bookedOrders, ...heldCheckouts]
      .map((order) =>
        order.scheduledStartAt
          ? getBookingZoneHour(order.scheduledStartAt)
          : null
      )
      .filter((hour): hour is number => typeof hour === "number")
  );

  return bookingTimeSlots.filter((slot) =>
    bookedStartHours.has(getSlotStartHour(slot))
  );
};

const getMarketForState = async (stateCode: string) => {
  try {
    const rows = await db
      .select()
      .from(markets)
      .where(eq(markets.stateCode, stateCode.toUpperCase()))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    logger.warn({ err: error, stateCode }, "location:market_lookup_failed");
    return null;
  }
};

const getTravelForAddress = (address: {
  latitude: number | null;
  longitude: number | null;
  state: string;
}) => {
  if (address.latitude === null || address.longitude === null) {
    return null;
  }

  return buildTravelEstimate({
    latitude: address.latitude,
    longitude: address.longitude,
    stateCode: address.state,
  });
};

const enrichAddress = async (input: {
  address: Awaited<ReturnType<typeof validateRadarAddress>>;
  includeProperty: boolean;
}) => {
  const property = input.includeProperty
    ? await lookupPropertyWithRentCast(input.address.formattedAddress)
    : null;
  const travel = getTravelForAddress(input.address);
  const market = travel ? await getMarketForState(input.address.state) : null;

  return { market, property, travel };
};

export const locationRoutes = new Hono<AppEnv>()
  .get("/addresses/autocomplete", async (c) => {
    const parsed = autocompleteQuerySchema.safeParse({
      input: c.req.query("input"),
    });
    if (!parsed.success) {
      return c.json({ suggestions: [] }, 200);
    }

    const suggestions = await autocompleteRadarAddresses(parsed.data.input);
    return c.json({ suggestions }, 200);
  })
  .post("/addresses/validate", async (c) => {
    const body = await c.req.json();
    const parsed = validateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const address = await validateRadarAddress(parsed.data.address);
    const {
      market: marketRow,
      property,
      travel,
    } = await enrichAddress({
      address,
      includeProperty: parsed.data.includeProperty,
    });

    logger.info(
      {
        distanceMiles: travel?.distanceMiles ?? null,
        feeCents: travel?.feeCents ?? null,
        inState: travel?.inState ?? null,
        marketMode: marketRow?.mode ?? null,
        propertyFallbackUsed: property?.fallbackUsed ?? null,
        propertyLotSizeSqft: property?.lotSizeSqft ?? null,
        propertySource: property?.source ?? null,
        requestId: c.get("requestId"),
        stateCode: address.state,
      },
      "location:address_validated"
    );

    return c.json(
      {
        address,
        market: marketRow
          ? {
              label: marketRow.label,
              mode: marketRow.mode,
              stateCode: marketRow.stateCode,
            }
          : null,
        property,
        travel,
      },
      200
    );
  })
  .get("/addresses/reverse-geocode", async (c) => {
    const parsed = reverseGeocodeSchema.safeParse({
      latitude: c.req.query("latitude"),
      longitude: c.req.query("longitude"),
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const address = await reverseGeocodeWithRadar(
      parsed.data.latitude,
      parsed.data.longitude
    ).catch((error: unknown) => {
      logger.error(
        {
          err: error,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          requestId: c.get("requestId"),
        },
        "location:reverse_geocode_failed"
      );

      return null;
    });

    if (!address) {
      return c.json({ error: "Current location could not be resolved" }, 502);
    }

    return c.json({ address }, 200);
  })
  .get("/availability", async (c) => {
    const parsed = availabilityQuerySchema.safeParse({
      date: c.req.query("date"),
      driveMinutes: c.req.query("driveMinutes"),
      latitude: c.req.query("latitude"),
      longitude: c.req.query("longitude"),
      stateCode: c.req.query("stateCode"),
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const travel =
      typeof parsed.data.latitude === "number" &&
      typeof parsed.data.longitude === "number"
        ? buildTravelEstimate({
            latitude: parsed.data.latitude,
            longitude: parsed.data.longitude,
            stateCode: parsed.data.stateCode,
          })
        : null;

    const driveMinutes = parsed.data.driveMinutes ?? travel?.driveMinutes ?? 0;

    const bookedSlots: BookingTimeSlot[] = await getBookedSlots(
      parsed.data.date
    ).catch((error: unknown) => {
      logger.error(
        {
          date: parsed.data.date,
          err: error,
          requestId: c.get("requestId"),
        },
        "booking_availability:lookup_failed"
      );

      return [];
    });
    const availableSlots = getAvailableBookingTimeSlots({
      bookedSlots,
      date: parsed.data.date,
      driveMinutes,
    });
    return c.json(
      {
        availableSlots,
        bookedSlots,
        driveMinutes,
        nextAvailableSlot: availableSlots[0] ?? null,
        travel,
      },
      200
    );
  });
