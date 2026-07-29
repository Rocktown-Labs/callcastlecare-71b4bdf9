export const bookingWindowHours = 2;
export const bookingTimeZone = "America/Chicago";
export const sameDayBookingBufferMinutes = 0;

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

export const getSlotStartMinutes = (slot: BookingTimeSlot) => {
  const startTime = parseTimePart(slot.split(" - ")[0] ?? slot);
  return startTime.hour * 60 + startTime.minute;
};

const zonedDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: bookingTimeZone,
  year: "numeric",
});

const getZonedParts = (date: Date) => {
  const parts = Object.fromEntries(
    zonedDatePartsFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)])
  );

  return {
    day: parts.day ?? 1,
    hour: parts.hour === 24 ? 0 : (parts.hour ?? 0),
    minute: parts.minute ?? 0,
    month: parts.month ?? 1,
    second: parts.second ?? 0,
    year: parts.year ?? 1970,
  };
};

const parseDateParts = (date: string) => {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);

  return { day, month, year };
};

const getUtcDateForBookingZoneTime = (input: {
  date: string;
  hour: number;
  minute?: number;
}) => {
  const { day, month, year } = parseDateParts(input.date);
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, input.hour, input.minute ?? 0, 0, 0)
  );
  const zonedGuess = getZonedParts(utcGuess);
  const zonedGuessAsUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second,
    0
  );
  const desiredAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    input.hour,
    input.minute ?? 0,
    0,
    0
  );

  return new Date(utcGuess.getTime() - (zonedGuessAsUtc - desiredAsUtc));
};

export const getBookingDateRange = (date: string) => {
  const startsAt = getUtcDateForBookingZoneTime({ date, hour: 0 });
  const { day, month, year } = parseDateParts(date);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0, 0));
  const nextDayParts = getZonedParts(nextDay);
  const nextDate = `${nextDayParts.year}-${String(nextDayParts.month).padStart(
    2,
    "0"
  )}-${String(nextDayParts.day).padStart(2, "0")}`;
  const endsAt = getUtcDateForBookingZoneTime({ date: nextDate, hour: 0 });

  return { endsAt, startsAt };
};

export const getBookingZoneDate = (date = new Date()) => {
  const parts = getZonedParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
};

export const getBookingZoneHour = (date: Date) => getZonedParts(date).hour;

export const getAvailableBookingTimeSlots = ({
  bookedSlots = [],
  date,
  now = new Date(),
}: {
  bookedSlots?: readonly BookingTimeSlot[];
  date: string;
  now?: Date;
}) => {
  const booked = new Set(bookedSlots);
  const bookingZoneDate = getBookingZoneDate(now);
  const nowParts = getZonedParts(now);
  const minimumStartMinutes =
    nowParts.hour * 60 + nowParts.minute + sameDayBookingBufferMinutes;

  return bookingTimeSlots.filter((slot) => {
    if (booked.has(slot)) {
      return false;
    }

    return date === bookingZoneDate
      ? getSlotStartMinutes(slot) > minimumStartMinutes
      : true;
  });
};

export const getScheduledWindowForSlot = (
  date: string,
  slot: BookingTimeSlot
) => {
  const startTime = parseTimePart(slot.split(" - ")[0] ?? slot);
  const start = getUtcDateForBookingZoneTime({
    date,
    hour: startTime.hour,
    minute: startTime.minute,
  });

  const end = new Date(start);
  end.setUTCHours(end.getUTCHours() + bookingWindowHours);

  return {
    scheduledEndAt: end.toISOString(),
    scheduledStartAt: start.toISOString(),
  };
};
