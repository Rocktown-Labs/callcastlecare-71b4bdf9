export const bookingWindowHours = 2;

export const bookingTimeSlots = [
  "6:00 AM - 8:00 AM",
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
] as const;

export type BookingTimeSlot = (typeof bookingTimeSlots)[number];

export const serviceHoursLabel = "Mon-Sun, 6am-6pm";

export const isBookingTimeSlot = (value: unknown): value is BookingTimeSlot =>
  typeof value === "string" && bookingTimeSlots.some((slot) => slot === value);

const parseTimePart = (value: string) => {
  const [time = "", period = "AM"] = value.split(" ");
  const [hourText = "0", minuteText = "0"] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  let normalizedHour = hour;
  if (period === "PM" && hour !== 12) {
    normalizedHour = hour + 12;
  }
  if (period === "AM" && hour === 12) {
    normalizedHour = 0;
  }

  return {
    hour: normalizedHour,
    minute,
  };
};

export const getSlotStartHour = (slot: BookingTimeSlot) =>
  parseTimePart(slot.split(" - ")[0] ?? slot).hour;

export const getScheduledWindowForSlot = (
  date: string,
  slot: BookingTimeSlot
) => {
  const startTime = parseTimePart(slot.split(" - ")[0] ?? slot);
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCHours(startTime.hour, startTime.minute, 0, 0);

  const end = new Date(start);
  end.setUTCHours(end.getUTCHours() + bookingWindowHours);

  return {
    scheduledEndAt: end.toISOString(),
    scheduledStartAt: start.toISOString(),
  };
};
