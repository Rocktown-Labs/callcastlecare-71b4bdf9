import { describe, expect, it } from "vitest";

import {
  getGroupStatus,
  getOrderGroupKey,
  isAdminOpenOrder,
} from "./admin-order-groups";

describe("admin order groups", () => {
  it("treats services in one checkout window as one ticket key", () => {
    const scheduledStartAt = new Date("2026-09-07T21:00:00.000Z");

    expect(
      getOrderGroupKey({
        checkoutSessionId: 12,
        id: 4,
        scheduledStartAt,
      })
    ).toBe(
      getOrderGroupKey({
        checkoutSessionId: 12,
        id: 5,
        scheduledStartAt,
      })
    );
    expect(
      getOrderGroupKey({
        checkoutSessionId: 12,
        id: 6,
        scheduledStartAt: new Date("2026-09-14T21:00:00.000Z"),
      })
    ).not.toBe(
      getOrderGroupKey({
        checkoutSessionId: 12,
        id: 4,
        scheduledStartAt,
      })
    );
  });

  it("prioritizes the most advanced active service status", () => {
    expect(getGroupStatus(["paid", "in_progress"])).toBe("in_progress");
    expect(getGroupStatus(["completed", "completed"])).toBe("completed");
    expect(getGroupStatus([])).toBe("paid");
  });

  it("only treats actionable work as open", () => {
    expect(isAdminOpenOrder("dispatching")).toBe(true);
    expect(isAdminOpenOrder("completed")).toBe(false);
  });
});
