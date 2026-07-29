import { describe, expect, it } from "vitest";

import {
  checkoutPreviewItemSchema,
  checkoutPreviewRequestSchema,
  publicQuoteRequestSchema,
  supportRequestSchema,
} from "./schemas";

const scheduledStartAt = "2026-07-28T14:00:00.000Z";
const scheduledEndAt = "2026-07-28T16:00:00.000Z";

describe("checkout schemas", () => {
  it("accepts a scheduled two-hour window washing line item", () => {
    const result = checkoutPreviewItemSchema.safeParse({
      cleanScreens: true,
      itemKind: "window_washing",
      packageType: "FULL_SERVICE",
      paneCount: 18,
      scheduledEndAt,
      scheduledStartAt,
      stories: 2,
      timingType: "scheduled",
    });

    expect(result.success).toBe(true);
  });

  it("rejects scheduled service windows that are not exactly two hours", () => {
    const result = checkoutPreviewItemSchema.safeParse({
      itemKind: "lawncare",
      planId: "groundskeeper-one-time",
      scheduledEndAt: "2026-07-28T15:00:00.000Z",
      scheduledStartAt,
      timingType: "scheduled",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Scheduled services must reserve exactly two hours."
      );
    }
  });

  it("requires either a free-form address or saved address id for preview", () => {
    const result = checkoutPreviewRequestSchema.safeParse({
      items: [
        {
          itemKind: "laundry",
          planId: "royal_wash_basic",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("public quote request schema", () => {
  it("accepts contact-captured public booking drafts", () => {
    const result = publicQuoteRequestSchema.safeParse({
      address: "123 Main St, Little Rock, AR",
      contact: {
        email: "customer@example.com",
        name: "Taylor Customer",
        phone: "5015550123",
      },
      lastCompletedStep: 2,
      payload: {
        services: ["laundry"],
      },
      status: "contact_captured",
      trackingId: "quote-request-123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid contact email values", () => {
    const result = publicQuoteRequestSchema.safeParse({
      contact: {
        email: "not-an-email",
      },
      payload: {},
      trackingId: "quote-request-123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["contact", "email"]);
      expect(result.error.issues[0]?.message).toBe("Invalid email address");
    }
  });

  it("rejects public booking phone values with letters", () => {
    const result = publicQuoteRequestSchema.safeParse({
      contact: {
        phone: "501-CALL-CARE",
      },
      payload: {},
      trackingId: "quote-request-123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["contact", "phone"]);
    }
  });
});

describe("support request schema", () => {
  it("rejects invalid phone values", () => {
    const result = supportRequestSchema.safeParse({
      email: "customer@example.com",
      message: "Please help me with a recent request.",
      name: "Taylor Customer",
      phone: "501-CALL-CARE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["phone"]);
    }
  });
});
