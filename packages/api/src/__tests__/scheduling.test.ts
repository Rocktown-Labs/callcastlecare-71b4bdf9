import { describe, expect, it } from "vitest";

import {
  getAvailableBookingTimeSlots,
  getScheduledWindowForSlot,
} from "../scheduling";

describe("booking scheduling", () => {
  it("stores appointment windows in UTC for the CastleCare service timezone", () => {
    expect(
      getScheduledWindowForSlot("2026-07-29", "10:00 AM - 12:00 PM")
    ).toEqual({
      scheduledEndAt: "2026-07-29T17:00:00.000Z",
      scheduledStartAt: "2026-07-29T15:00:00.000Z",
    });
  });

  it("hides past and too-soon slots for today's CastleCare service date", () => {
    const slots = getAvailableBookingTimeSlots({
      date: "2026-07-29",
      now: new Date("2026-07-29T17:00:00.000Z"),
    });

    expect(slots).toEqual(["2:00 PM - 4:00 PM", "4:00 PM - 6:00 PM"]);
  });

  it("keeps all unbooked slots available on future dates", () => {
    const slots = getAvailableBookingTimeSlots({
      bookedSlots: ["10:00 AM - 12:00 PM"],
      date: "2026-07-30",
      now: new Date("2026-07-29T17:00:00.000Z"),
    });

    expect(slots).toEqual([
      "6:00 AM - 8:00 AM",
      "8:00 AM - 10:00 AM",
      "12:00 PM - 2:00 PM",
      "2:00 PM - 4:00 PM",
      "4:00 PM - 6:00 PM",
    ]);
  });
});
