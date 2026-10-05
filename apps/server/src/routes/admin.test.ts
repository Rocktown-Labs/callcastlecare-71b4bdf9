import type * as DbModule from "@callcastlecare/db";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";
import { adminRoutes } from "./admin";

const mocks = vi.hoisted(() => ({
  checkoutSettingsFindFirst: vi.fn(),
  insertOnConflictDoUpdate: vi.fn(),
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
        onConflictDoUpdate: mocks.insertOnConflictDoUpdate,
        values: mocks.insertValues,
      })),
      query: {
        checkoutSettings: {
          findFirst: mocks.checkoutSettingsFindFirst,
        },
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

describe("admin checkout settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertValues.mockReturnValue({
      onConflictDoUpdate: mocks.insertOnConflictDoUpdate,
    });
    mocks.insertOnConflictDoUpdate.mockResolvedValue([]);
  });

  it("falls back to defaults when no settings row exists", async () => {
    mocks.checkoutSettingsFindFirst.mockResolvedValue(null);

    const response = await app.request("/admin/checkout/settings");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowCashCheckout: true });
  });

  it("returns the current checkout settings", async () => {
    mocks.checkoutSettingsFindFirst.mockResolvedValue({
      allowCashCheckout: false,
      id: 1,
    });

    const response = await app.request("/admin/checkout/settings");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowCashCheckout: false });
  });

  it("updates the cash checkout setting", async () => {
    const response = await app.request("/admin/checkout/settings", {
      body: JSON.stringify({ allowCashCheckout: false }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowCashCheckout: false });
    expect(mocks.insertValues).toHaveBeenCalledWith({
      allowCashCheckout: false,
      id: 1,
    });
    expect(mocks.insertOnConflictDoUpdate).toHaveBeenCalled();
  });

  it("rejects an invalid checkout settings payload", async () => {
    const response = await app.request("/admin/checkout/settings", {
      body: JSON.stringify({ allowCashCheckout: "yes" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(response.status).toBe(400);
  });

  it("blocks non-admin users from editing checkout settings", async () => {
    const forbiddenApp = new Hono<AppEnv>()
      .use("*", async (c, next) => {
        c.set("user", {
          email: "user@example.com",
          id: "normal_user",
          name: "Normal User",
          role: null,
        });
        c.set("session", { id: "session" });
        return await next();
      })
      .route("/admin", adminRoutes);

    const response = await forbiddenApp.request("/admin/checkout/settings", {
      body: JSON.stringify({ allowCashCheckout: false }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(response.status).toBe(403);
  });
});
