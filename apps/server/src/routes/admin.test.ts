import type * as DbModule from "@callcastlecare/db";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";
import { adminRoutes } from "./admin";

const mocks = vi.hoisted(() => ({
  insertValues: vi.fn(),
  mediaFindMany: vi.fn(),
  orderFindFirst: vi.fn(),
  orderMediaFindMany: vi.fn(),
  setOrderStatus: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
}));

vi.mock("@callcastlecare/db", async (importOriginal) => {
  const original = await importOriginal<typeof DbModule>();

  return {
    ...original,
    db: {
      insert: vi.fn(() => ({
        values: mocks.insertValues,
      })),
      query: {
        mediaAssets: {
          findMany: mocks.mediaFindMany,
        },
        orderMediaLinks: {
          findMany: mocks.orderMediaFindMany,
        },
        orders: {
          findFirst: mocks.orderFindFirst,
        },
      },
      update: vi.fn(() => ({
        set: mocks.updateSet,
      })),
    },
  };
});

vi.mock("../lib/orders", () => ({
  setOrderStatus: mocks.setOrderStatus,
}));

const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("user", {
      email: "cg@rocktownlabs.com",
      id: "admin_user",
      name: "Castle Admin",
      role: null,
    });
    c.set("session", { id: "session" });
    return await next();
  })
  .route("/admin", adminRoutes);

describe("admin order field actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateSet.mockReturnValue({
      where: mocks.updateWhere,
    });
    mocks.updateWhere.mockResolvedValue([]);
    mocks.insertValues.mockResolvedValue([]);
    mocks.setOrderStatus.mockImplementation(async () => {});
  });

  it("requires a before photo before starting service", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: 12,
      serviceType: "window_washing",
      status: "arrived",
    });
    mocks.orderMediaFindMany.mockResolvedValue([]);

    const response = await app.request("/admin/orders/12/actions", {
      body: JSON.stringify({ action: "start" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Before photo is required",
    });
    expect(mocks.setOrderStatus).not.toHaveBeenCalled();
  });

  it("starts service when a generic before photo is attached", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: 12,
      serviceType: "window_washing",
      status: "arrived",
    });
    mocks.orderMediaFindMany.mockResolvedValue([{ mediaAssetId: 99 }]);
    mocks.mediaFindMany.mockResolvedValue([{ mediaType: "service_before" }]);

    const response = await app.request("/admin/orders/12/actions", {
      body: JSON.stringify({ action: "start" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(mocks.setOrderStatus).toHaveBeenCalledWith({
      note: "Admin started service",
      orderId: 12,
      toStatus: "in_progress",
      triggeredByUserId: "admin_user",
    });
  });
});
