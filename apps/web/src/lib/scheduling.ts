import { bookingTimeSlots, isBookingTimeSlot } from "@callcastlecare/api";
import type { BookingTimeSlot as ApiBookingTimeSlot } from "@callcastlecare/api";

import { getServerUrl } from "./server-url";

export type { BookingTimeSlot } from "@callcastlecare/api";
export {
  bookingTimeSlots,
  bookingWindowHours,
  getScheduledWindowForSlot,
  getSlotStartHour,
  isBookingTimeSlot,
  serviceHoursLabel,
} from "@callcastlecare/api";

export interface BookingAvailability {
  availableSlots: ApiBookingTimeSlot[];
  bookedSlots: ApiBookingTimeSlot[];
  nextAvailableSlot: ApiBookingTimeSlot | null;
}

const parseSlots = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isBookingTimeSlot);
};

export const getDefaultBookingAvailability = (): BookingAvailability => ({
  availableSlots: [...bookingTimeSlots],
  bookedSlots: [],
  nextAvailableSlot: bookingTimeSlots[0],
});

export const fetchBookingAvailability = async (
  date: string
): Promise<BookingAvailability> => {
  if (!date) {
    return getDefaultBookingAvailability();
  }

  const url = new URL("/api/v1/locations/availability", getServerUrl());
  url.searchParams.set("date", date);

  const response = await fetch(url);
  if (!response.ok) {
    return getDefaultBookingAvailability();
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
    nextAvailableSlot,
  };
};
