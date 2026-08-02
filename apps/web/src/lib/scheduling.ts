import {
  bookingTimeSlots,
  getAvailableBookingTimeSlots,
  isBookingTimeSlot,
} from "@callcastlecare/api";
import type {
  BookingTimeSlot as ApiBookingTimeSlot,
  TravelEstimate,
} from "@callcastlecare/api";

import { getServerUrl } from "./server-url";

export type { BookingTimeSlot } from "@callcastlecare/api";
export {
  bookingTimeSlots,
  bookingWindowHours,
  getAvailableBookingTimeSlots,
  getScheduledWindowForSlot,
  getSlotStartHour,
  isBookingTimeSlot,
  serviceHoursLabel,
} from "@callcastlecare/api";

export interface BookingAvailability {
  availableSlots: ApiBookingTimeSlot[];
  bookedSlots: ApiBookingTimeSlot[];
  driveMinutes: number;
  nextAvailableSlot: ApiBookingTimeSlot | null;
  travel: TravelEstimate | null;
}

export interface AvailabilityQuery {
  date: string;
  driveMinutes?: number;
  latitude?: number | null;
  longitude?: number | null;
  stateCode?: string | null;
}

const parseSlots = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isBookingTimeSlot);
};

export const getDefaultBookingAvailability = (
  input?: Partial<AvailabilityQuery>
): BookingAvailability => {
  const driveMinutes = input?.driveMinutes ?? 0;
  const availableSlots = input?.date
    ? getAvailableBookingTimeSlots({
        date: input.date,
        driveMinutes,
      })
    : [...bookingTimeSlots];

  return {
    availableSlots,
    bookedSlots: [],
    driveMinutes,
    nextAvailableSlot: availableSlots[0] ?? null,
    travel: null,
  };
};

export const fetchBookingAvailability = async (
  input: string | AvailabilityQuery
): Promise<BookingAvailability> => {
  const query = typeof input === "string" ? { date: input } : input;
  if (!query.date) {
    return getDefaultBookingAvailability(query);
  }

  const url = new URL("/api/v1/locations/availability", getServerUrl());
  url.searchParams.set("date", query.date);
  if (typeof query.driveMinutes === "number") {
    url.searchParams.set("driveMinutes", String(query.driveMinutes));
  }
  if (typeof query.latitude === "number") {
    url.searchParams.set("latitude", String(query.latitude));
  }
  if (typeof query.longitude === "number") {
    url.searchParams.set("longitude", String(query.longitude));
  }
  if (query.stateCode) {
    url.searchParams.set("stateCode", query.stateCode);
  }

  const response = await fetch(url);
  if (!response.ok) {
    return getDefaultBookingAvailability(query);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const availableSlots = parseSlots(payload.availableSlots);
  const bookedSlots = parseSlots(payload.bookedSlots);
  const nextAvailableSlot = isBookingTimeSlot(payload.nextAvailableSlot)
    ? payload.nextAvailableSlot
    : (availableSlots[0] ?? null);

  return {
    availableSlots,
    bookedSlots,
    driveMinutes:
      typeof payload.driveMinutes === "number" ? payload.driveMinutes : 0,
    nextAvailableSlot,
    travel:
      payload.travel && typeof payload.travel === "object"
        ? (payload.travel as TravelEstimate)
        : null,
  };
};
