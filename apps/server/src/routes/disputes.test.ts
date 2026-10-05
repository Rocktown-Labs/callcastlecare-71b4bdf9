import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";
import { disputeRoutes } from "./disputes";

const mocks = vi.hoisted(() => ({
  dbInsert: vi.fn(),
  getOrCreateCustomerForUser: vi.fn(),
  logger: {
    info: vi.fn(),
  },
  requireUser: vi.fn(),
  selectLimit: vi.fn(),
}));

vi.mock("@callcastlecare/db", () => ({
  and: vi.fn(),
  db: {
    insert: mocks.dbInsert,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mocks.selectLimit,
        })),
      })),
    })),
  },
  desc: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@callcastlecare/db/schema/index", () => ({
  orderDisputes: {
    createdAt: "createdAt",
    id: "id",
  },
  orders: {
    completedAt: "completedAt",
    customerId: "customerId",
    id: "id",
    status: "status",
    tipAmountCents: "tipAmountCents",
  },
}));

vi.mock("@callcastlecare/env/server", () => ({
  env: {
    ADMIN_EMAIL: "admin@example.com",
  },
}));

vi.mock("../lib/auth", () => ({
  getOrCreateCustomerForUser: mocks.getOrCreateCustomerForUser,
  requireUser: mocks.requireUser,
}));

vi.mock("../lib/logger", () => ({
  logger: mocks.logger,
}));

const app = new Hono<AppEnv>().route("/disputes", disputeRoutes);

const user = {
  email: "customer@example.com",
  id: "user_123",
  name: "Taylor Customer",
  role: "user",
};

const order = {
  completedAt: new Date("2026-08-01T12:00:00.000Z"),
  id: 42,
  status: "completed",
  tipAmountCents: 0,
};

const dispute = {
  id: 7,
  orderId: 42,
  reason: "The service was not completed as expected",
  status: "open",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockReturnValue({ error: null, user });
  mocks.getOrCreateCustomerForUser.mockResolvedValue({ id: 9 });
  mocks.selectLimit.mockResolvedValue([order]);
  mocks.dbInsert.mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([dispute]),
    })),
  });
});

describe("dispute routes", () => {
  it("requires an authenticated customer to open a dispute", async () => {
    const unauthorized = Response.json(
      { error: "unauthorized" },
      { status: 401 }
    );
    mocks.requireUser.mockReturnValue({ error: unauthorized, user: null });

    const response = await app.request("/disputes", {
      body: JSON.stringify({
        orderId: 42,
        reason: "The service was not completed as expected",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(401);
    expect(mocks.selectLimit).not.toHaveBeenCalled();
  });

  it("only opens disputes for an order owned by the authenticated customer", async () => {
    mocks.selectLimit.mockResolvedValue([]);

    const response = await app.request("/disputes", {
      body: JSON.stringify({
        orderId: 42,
        reason: "The service was not completed as expected",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Order not found" });
    expect(mocks.dbInsert).not.toHaveBeenCalled();
  });

  it("opens a dispute for an owned order", async () => {
    const response = await app.request("/disputes", {
      body: JSON.stringify({
        orderId: 42,
        reason: "The service was not completed as expected",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ dispute });
    expect(mocks.getOrCreateCustomerForUser).toHaveBeenCalledWith(user);
  });
});
