import type * as DbModule from "@callcastlecare/db";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  query: {
    from: vi.fn(),
    leftJoin: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
  },
}));

vi.mock("@callcastlecare/db", async (importOriginal) => {
  const original = await importOriginal<typeof DbModule>();

  return {
    ...original,
    db: {
      select: mocks.dbSelect,
    },
  };
});

const { adminRoutes } = await import("./admin");

const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("user", {
      email: "admin@example.com",
      id: "admin_user",
      name: "Castle Admin",
      role: "admin",
    });
    c.set("session", { id: "session" });
    return await next();
  })
  .route("/admin", adminRoutes);

describe("admin order queue", () => {
  it("returns one ticket with service labels for a multi-service booking", async () => {
    const scheduledStartAt = new Date("2026-09-07T21:00:00.000Z");
    const rows = [
      {
        address: { formattedAddress: "123 Castle Way" },
        customer: {
          email: "arthur@example.com",
          firstName: "Arthur",
          lastName: "Pendragon",
        },
        order: {
          checkoutSessionId: 12,
          id: 4,
          scheduledStartAt,
          serviceType: "lawncare",
          status: "paid",
          totalPriceCents: 10_000,
        },
      },
      {
        address: { formattedAddress: "123 Castle Way" },
        customer: {
          email: "arthur@example.com",
          firstName: "Arthur",
          lastName: "Pendragon",
        },
        order: {
          checkoutSessionId: 12,
          id: 5,
          scheduledStartAt,
          serviceType: "laundry",
          status: "dispatching",
          totalPriceCents: 8000,
        },
      },
    ];

    mocks.query.from.mockReturnValue(mocks.query);
    mocks.query.leftJoin.mockReturnValue(mocks.query);
    mocks.query.where.mockReturnValue(mocks.query);
    mocks.query.orderBy.mockReturnValue(mocks.query);
    mocks.query.limit.mockResolvedValue(rows);
    mocks.dbSelect.mockReturnValue(mocks.query);

    const response = await app.request("/admin/orders");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      orders: [
        {
          order: {
            groupStatus: "dispatching",
            orderIds: [4, 5],
            serviceCount: 2,
            serviceLabel: "Multiple services",
            serviceLabels: ["Lawn Care", "Laundry"],
            totalPriceCents: 18_000,
          },
        },
      ],
    });
  });
});
