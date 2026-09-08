import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";
import { adminRoutes } from "./admin";

const schemaTables = vi.hoisted(() => ({
  addresses: { id: "addresses.id" },
  customers: { id: "customers.id" },
  dispatchBatches: { id: "dispatchBatches.id" },
  dispatchOffers: { id: "dispatchOffers.id" },
  orders: { id: "orders.id" },
  routeStops: { id: "routeStops.id" },
  user: { id: "user.id" },
  workerRoutes: { id: "workerRoutes.id" },
  workers: { id: "workers.id" },
}));

const insertedBatchRows = (table: unknown) => {
  if (table === schemaTables.dispatchBatches) {
    return [{ id: 11 }];
  }
  if (table === schemaTables.dispatchOffers) {
    return [{ id: 22 }];
  }
  return [];
};

const mocks = vi.hoisted(() => ({
  addressFindMany: vi.fn(),
  customerFindMany: vi.fn(),
  dbDelete: vi.fn(),
  dbInsert: vi.fn(),
  dbTransaction: vi.fn(),
  dbUpdate: vi.fn(),
  dispatchOfferFindFirst: vi.fn(),
  env: { ADMIN_EMAIL: "cg@rocktownlabs.com" },
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  orderFindFirst: vi.fn(),
  orderFindMany: vi.fn(),
  outbox: vi.fn(),
  publishOutboxEvent: vi.fn(),
  routeFindFirst: vi.fn(),
  routeFindMany: vi.fn(),
  routeInsertChain: vi.fn(),
  routeValues: vi.fn(),
  stopDeleteReturning: vi.fn(),
  stopFindFirst: vi.fn(),
  stopFindMany: vi.fn(),
  stopInsertReturning: vi.fn(),
  updateReturning: vi.fn(),
  userFindFirst: vi.fn(),
  workerFindFirst: vi.fn(),
  workerFindMany: vi.fn(),
}));

vi.mock("@callcastlecare/db", () => ({
  and: vi.fn(),
  db: {
    delete: mocks.dbDelete,
    insert: mocks.dbInsert,
    query: {
      addresses: { findMany: mocks.addressFindMany },
      customers: { findMany: mocks.customerFindMany },
      dispatchOffers: { findFirst: mocks.dispatchOfferFindFirst },
      orders: {
        findFirst: mocks.orderFindFirst,
        findMany: mocks.orderFindMany,
      },
      routeStops: {
        findFirst: mocks.stopFindFirst,
        findMany: mocks.stopFindMany,
      },
      user: { findFirst: mocks.userFindFirst },
      workerRoutes: {
        findFirst: mocks.routeFindFirst,
        findMany: mocks.routeFindMany,
      },
      workers: {
        findFirst: mocks.workerFindFirst,
        findMany: mocks.workerFindMany,
      },
    },
    transaction: mocks.dbTransaction,
    update: mocks.dbUpdate,
  },
  desc: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock("@callcastlecare/db/schema/index", () => schemaTables);

vi.mock("@callcastlecare/env/server", () => ({
  env: mocks.env,
}));

vi.mock("../lib/admin-order-groups", () => ({
  getGroupStatus: vi.fn(() => "dispatching"),
  getOrderGroupKey: vi.fn(),
  getOrderGroupMembers: vi.fn(),
  serviceLabels: {},
  statusLabels: {},
}));

vi.mock("../lib/checkout-settings", () => ({
  getCheckoutSettings: vi.fn(),
  updateCheckoutSettings: vi.fn(),
}));

vi.mock("../lib/integrations/stripe-catalog", () => ({
  createStripeClientOrThrow: vi.fn(),
  ensureStripeWebhookEndpoints: vi.fn(),
  getStripeIntegrationStatus: vi.fn(),
  syncStripeCatalogItem: vi.fn(),
  syncStripeCoupon: vi.fn(),
}));

vi.mock("../lib/integrations/stripe-client", () => ({
  getStripeMode: vi.fn(() => "test"),
}));

vi.mock("../lib/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("../lib/orders", () => ({
  setOrderStatus: vi.fn(),
}));

vi.mock("../lib/outbox", () => ({
  publishOutboxEvent: mocks.publishOutboxEvent,
}));

vi.mock("../lib/payouts", () => ({
  createCompletionPayoutRecords: vi.fn(),
}));

vi.mock("../lib/refunds", () => {
  class RefundError extends Error {
    statusCode = 500;

    constructor() {
      super("refund failed");
      this.name = "RefundError";
    }
  }
  return {
    RefundError,
    createAdminRefund: vi.fn(),
  };
});

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

const activeWorker = {
  id: 7,
  isActive: true,
  onboardingStatus: "approved",
  servicesOffered: ["lawncare"],
};

const openOrder = {
  assignedWorkerId: null,
  dispatchStartedAt: null,
  id: 6,
  serviceType: "lawncare",
  status: "paid",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.workerFindFirst.mockResolvedValue(activeWorker);
  mocks.orderFindFirst.mockResolvedValue(openOrder);
  mocks.dispatchOfferFindFirst.mockResolvedValue(null);
  mocks.dbInsert.mockImplementation((table: unknown) => ({
    onConflictDoUpdate: mocks.routeInsertChain,
    values: vi.fn((values: unknown) => {
      if (table === schemaTables.workerRoutes) {
        mocks.routeValues(values);
      }
      return {
        onConflictDoUpdate: mocks.routeInsertChain,
        returning: vi.fn().mockResolvedValue(insertedBatchRows(table)),
      };
    }),
  }));
  mocks.dbTransaction.mockResolvedValue({
    batch: { id: 11 },
    offer: { id: 22 },
  });
  mocks.routeInsertChain.mockImplementation(() => ({
    returning: vi.fn().mockResolvedValue([
      {
        id: 3,
        routeDate: "2026-09-08",
        status: "draft",
        workerId: activeWorker.id,
      },
    ]),
  }));
  mocks.dbUpdate.mockReturnValue({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: mocks.updateReturning,
      })),
    })),
  });
  mocks.updateReturning.mockResolvedValue([{ id: 3 }]);
  mocks.stopInsertReturning.mockResolvedValue([{ id: 44 }]);
  mocks.dbDelete.mockReturnValue({
    where: vi.fn(() => ({
      returning: mocks.stopDeleteReturning,
    })),
  });
  mocks.stopDeleteReturning.mockResolvedValue([{ id: 44 }]);
  mocks.publishOutboxEvent.mockImplementation(() => Promise.resolve());
});

describe("POST /admin/orders/:orderId/dispatch", () => {
  it("creates a batch and offer for an eligible worker", async () => {
    const response = await app.request("/admin/orders/6/dispatch", {
      body: JSON.stringify({ workerId: 7 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      offer: { id: number };
      worker: { id: number };
    };
    expect(payload.offer).toMatchObject({ id: 22 });
    expect(payload.worker).toMatchObject({ id: 7 });
    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith({
      eventName: "order_dispatched",
      payload: { adminAssigned: true, orderId: 6, workerId: 7 },
    });
  });

  it("returns the existing pending offer instead of duplicating", async () => {
    mocks.dispatchOfferFindFirst.mockResolvedValue({ id: 22 });

    const response = await app.request("/admin/orders/6/dispatch", {
      body: JSON.stringify({ workerId: 7 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ alreadySent: true });
    expect(mocks.dbInsert).not.toHaveBeenCalled();
  });

  it("rejects workers that are not active for dispatch", async () => {
    mocks.workerFindFirst.mockResolvedValue({
      ...activeWorker,
      isActive: false,
    });

    const response = await app.request("/admin/orders/6/dispatch", {
      body: JSON.stringify({ workerId: 7 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(409);
  });

  it("rejects workers that do not offer the service", async () => {
    mocks.workerFindFirst.mockResolvedValue({
      ...activeWorker,
      servicesOffered: ["laundry"],
    });

    const response = await app.request("/admin/orders/6/dispatch", {
      body: JSON.stringify({ workerId: 7 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(409);
  });

  it("rejects finished orders", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      ...openOrder,
      status: "completed",
    });

    const response = await app.request("/admin/orders/6/dispatch", {
      body: JSON.stringify({ workerId: 7 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(409);
  });
});

describe("admin routes", () => {
  it("creates a route for a worker and date", async () => {
    const response = await app.request("/admin/routes", {
      body: JSON.stringify({ routeDate: "2026-09-08", workerId: 7 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      route: { id: 3, workerId: 7 },
    });
  });

  it("honors a provided name when a route is upserted", async () => {
    const response = await app.request("/admin/routes", {
      body: JSON.stringify({
        name: "Morning route",
        routeDate: "2026-09-08",
        workerId: 7,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(mocks.routeValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Morning route" })
    );
    expect(mocks.routeInsertChain).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ name: "Morning route" }),
      })
    );
  });

  it("rejects an invalid route status filter", async () => {
    const response = await app.request("/admin/routes?status=flying");

    expect(response.status).toBe(400);
    expect(mocks.routeFindMany).not.toHaveBeenCalled();
  });

  it("lists routes with worker and stop counts", async () => {
    mocks.routeFindMany.mockResolvedValue([
      { id: 3, routeDate: "2026-09-08", status: "draft", workerId: 7 },
    ]);
    mocks.workerFindMany.mockResolvedValue([activeWorker]);
    mocks.stopFindMany.mockResolvedValue([{ id: 44, routeId: 3 }]);

    const response = await app.request("/admin/routes");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      routes: [
        {
          id: 3,
          routeDate: "2026-09-08",
          status: "draft",
          stopCount: 1,
          worker: activeWorker,
          workerId: 7,
        },
      ],
    });
  });

  it("returns a route detail with enriched stops", async () => {
    mocks.routeFindFirst.mockResolvedValue({
      id: 3,
      routeDate: "2026-09-08",
      status: "draft",
      workerId: 7,
    });
    mocks.workerFindFirst.mockResolvedValue(activeWorker);
    mocks.stopFindMany.mockResolvedValue([{ id: 44, orderId: 6, routeId: 3 }]);
    mocks.orderFindMany.mockResolvedValue([
      { addressId: 11, customerId: 22, id: 6 },
    ]);
    mocks.customerFindMany.mockResolvedValue([{ id: 22 }]);
    mocks.addressFindMany.mockResolvedValue([{ id: 11 }]);

    const response = await app.request("/admin/routes/3");

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      route: { id: number };
      stops: { id: number; order: { id: number } | null }[];
      worker: { id: number };
    };
    expect(payload.route.id).toBe(3);
    expect(payload.worker.id).toBe(7);
    expect(payload.stops[0]).toMatchObject({ id: 44, order: { id: 6 } });
  });

  it("adds an order stop with the next sequence", async () => {
    mocks.routeFindFirst.mockResolvedValue({ id: 3, workerId: 7 });
    mocks.stopFindFirst.mockResolvedValue(null);
    mocks.stopFindMany.mockResolvedValue([{ sequence: 1 }]);
    mocks.dbInsert.mockImplementation(() => ({
      values: vi.fn(() => ({ returning: mocks.stopInsertReturning })),
    }));

    const response = await app.request("/admin/routes/3/stops", {
      body: JSON.stringify({ orderId: 6 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ stop: { id: 44 } });
  });

  it("reports already-added stops without duplicating", async () => {
    mocks.routeFindFirst.mockResolvedValue({ id: 3, workerId: 7 });
    mocks.stopFindFirst.mockResolvedValue({ id: 44 });

    const response = await app.request("/admin/routes/3/stops", {
      body: JSON.stringify({ orderId: 6 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ alreadyAdded: true });
  });

  it("removes a stop and updates route status", async () => {
    const removeResponse = await app.request("/admin/routes/3/stops/44", {
      method: "DELETE",
    });
    expect(removeResponse.status).toBe(200);

    const statusResponse = await app.request("/admin/routes/3", {
      body: JSON.stringify({ status: "published" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    expect(statusResponse.status).toBe(200);
  });
});
