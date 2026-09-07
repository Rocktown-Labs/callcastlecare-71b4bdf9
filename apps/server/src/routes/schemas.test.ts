import { describe, expect, it } from "vitest";

import {
  adminWorkerCreateRequestSchema,
  adminWorkerStatusRequestSchema,
  adminWorkerUpdateRequestSchema,
  checkoutPreviewItemSchema,
  checkoutPreviewRequestSchema,
  publicQuoteRequestSchema,
  supportRequestSchema,
} from "./schemas";

const scheduledStartAt = "2099-07-28T14:00:00.000Z";
const scheduledEndAt = "2099-07-28T16:00:00.000Z";

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

  it("rejects scheduled service windows in the past", () => {
    const result = checkoutPreviewItemSchema.safeParse({
      itemKind: "lawncare",
      planId: "groundskeeper-one-time",
      scheduledEndAt: "2026-07-28T16:00:00.000Z",
      scheduledStartAt: "2026-07-28T14:00:00.000Z",
      timingType: "scheduled",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.message === "Scheduled services must start in the future."
        )
      ).toBe(true);
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

describe("admin worker schemas", () => {
  it("accepts a valid staff creation payload with city and state", () => {
    const result = adminWorkerCreateRequestSchema.safeParse({
      city: "Little Rock",
      email: "pro@example.com",
      firstName: "Marcus",
      lastName: "Vance",
      phone: "(501) 555-0144",
      serviceRadiusMiles: 20,
      servicesOffered: ["lawncare", "window_washing"],
      state: "AR",
      streetAddress: "123 Main St",
      zip: "72201",
    });

    expect(result.success).toBe(true);
  });

  it("normalizes hyphenated window-washing service values", () => {
    const result = adminWorkerCreateRequestSchema.safeParse({
      email: "pro@example.com",
      firstName: "Sarah",
      lastName: "Jenkins",
      phone: "5015550188",
      servicesOffered: ["window-washing"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servicesOffered).toEqual(["window_washing"]);
    }
  });

  it("rejects staff creation without services", () => {
    const result = adminWorkerCreateRequestSchema.safeParse({
      email: "pro@example.com",
      firstName: "Marcus",
      lastName: "Vance",
      phone: "(501) 555-0144",
      servicesOffered: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid status transitions", () => {
    const result = adminWorkerStatusRequestSchema.safeParse({
      status: "on_leave",
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial staff updates", () => {
    const result = adminWorkerUpdateRequestSchema.safeParse({
      city: "Fayetteville",
      serviceRadiusMiles: 30,
      state: "AR",
    });

    expect(result.success).toBe(true);
  });
});
