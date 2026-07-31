import {
  bookingTimeSlots,
  getAvailableBookingTimeSlots,
  getBookingDateRange,
  getBookingZoneHour,
  getSlotStartHour,
} from "@callcastlecare/api";
import type { BookingTimeSlot } from "@callcastlecare/api";
import { and, db, gte, inArray, lt } from "@callcastlecare/db";
import { orders } from "@callcastlecare/db/schema/index";
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
  const bookedOrders = await db.query.orders.findMany({
    columns: {
      scheduledStartAt: true,
    },
    where: and(
      gte(orders.scheduledStartAt, startsAt),
      lt(orders.scheduledStartAt, endsAt),
      inArray(orders.status, activeOrderStatuses)
    ),
  });

  const bookedStartHours = new Set(
    bookedOrders
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
    const property = parsed.data.includeProperty
      ? await lookupPropertyWithRentCast(
          address?.formattedAddress ?? parsed.data.address
        )
      : null;

    return c.json({ address, property }, 200);
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
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

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
    });
    return c.json(
      {
        availableSlots,
        bookedSlots,
        nextAvailableSlot: availableSlots[0] ?? null,
      },
      200
    );
  });
