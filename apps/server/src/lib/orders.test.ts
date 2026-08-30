import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  and: vi.fn(),
  checkoutItems: {},
  checkoutSessions: {},
  dbQueryCheckoutSession: vi.fn(),
  dbTransaction: vi.fn(),
  dispatchOrder: vi.fn(),
  eq: vi.fn(),
  execute: vi.fn(),
  logger: { info: vi.fn() },
  orderInsertReturning: vi.fn(),
  orders: {},
  publishOutboxEvent: vi.fn(),
  serviceLegs: {},
  txInsert: vi.fn(),
  txOrdersFindMany: vi.fn(),
  txQueryCheckoutItems: vi.fn(),
  txUpdate: vi.fn(),
}));

vi.mock("@callcastlecare/db", () => ({
  and: mocks.and,
  db: {
    query: {
      checkoutSessions: {
        findFirst: mocks.dbQueryCheckoutSession,
      },
    },
    transaction: mocks.dbTransaction,
  },
  eq: mocks.eq,
  sql: vi.fn(() => "advisory-lock"),
}));

vi.mock("@callcastlecare/db/schema/index", () => ({
  addresses: {},
  checkoutItems: mocks.checkoutItems,
  checkoutSessions: mocks.checkoutSessions,
  homePreorders: {},
  orderStatusHistory: {},
  orders: mocks.orders,
  serviceLegs: mocks.serviceLegs,
}));

vi.mock("./dispatch", () => ({
  dispatchOrder: mocks.dispatchOrder,
}));

vi.mock("./domain/checkout", () => ({
  getComboServiceTypes: vi.fn(),
}));

vi.mock("./logger", () => ({
  logger: mocks.logger,
}));

vi.mock("./outbox", () => ({
  publishOutboxEvent: mocks.publishOutboxEvent,
}));

const { finalizeCheckoutPayment } = await import("./orders");

const checkoutSession = {
  addressId: 11,
  customerId: 22,
  id: 33,
  status: "pending_payment",
  stripePaymentIntentId: "pi_combo",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dbQueryCheckoutSession.mockResolvedValue(checkoutSession);
  mocks.txQueryCheckoutItems.mockResolvedValue([
    {
      basePriceCents: 30_000,
      itemKind: "lawncare",
      metadataJson: {
        comboServiceTypes: ["lawncare", "laundry", "window_washing"],
        pricingTier: "small",
        serviceType: "combo",
      },
      scheduledEndAt: new Date("2026-09-01T16:00:00.000Z"),
      scheduledStartAt: new Date("2026-09-01T14:00:00.000Z"),
      timingType: "scheduled",
      tipAmountCents: 0,
      totalPriceCents: 30_000,
    },
  ]);
  mocks.txOrdersFindMany.mockResolvedValue([]);
  mocks.txUpdate.mockReturnValue({
    set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
  });
  let orderId = 0;
  mocks.orderInsertReturning.mockImplementation(() => {
    orderId += 1;
    return [
      {
        id: orderId,
        serviceType: ["lawncare", "laundry", "window_washing"][orderId - 1],
      },
    ];
  });
  mocks.txInsert.mockImplementation((table: unknown) => ({
    values: vi.fn(() => {
      if (table === mocks.orders) {
        return { returning: mocks.orderInsertReturning };
      }
      return Promise.resolve();
    }),
  }));
  const transaction = {
    execute: mocks.execute,
    insert: mocks.txInsert,
    query: {
      checkoutItems: { findMany: mocks.txQueryCheckoutItems },
      orders: { findMany: mocks.txOrdersFindMany },
    },
    update: mocks.txUpdate,
  };
  mocks.dbTransaction.mockImplementation((transactionCallback) =>
    Reflect.apply(transactionCallback, undefined, [transaction])
  );
});

describe("finalizeCheckoutPayment", () => {
  it("materializes combo checkout items into service orders", async () => {
    const result = await finalizeCheckoutPayment({
      checkoutSessionId: checkoutSession.id,
      stripePaymentIntentId: "pi_combo",
    });

    expect(result.createdOrderIds).toEqual([1, 2, 3]);
    expect(mocks.dispatchOrder).toHaveBeenCalledTimes(3);
    expect(mocks.dispatchOrder).toHaveBeenCalledWith({
      orderId: 1,
      sequence: 1,
    });
    expect(mocks.dispatchOrder).toHaveBeenCalledWith({
      orderId: 2,
      sequence: 1,
    });
    expect(mocks.dispatchOrder).toHaveBeenCalledWith({
      orderId: 3,
      sequence: 1,
    });
    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith({
      eventName: "checkout_confirmed",
      payload: {
        checkoutSessionId: checkoutSession.id,
        customerId: checkoutSession.customerId,
      },
    });
  });

  it("materializes recurring service units for the first billing period", async () => {
    mocks.txQueryCheckoutItems.mockResolvedValue([
      {
        basePriceCents: 20_000,
        itemKind: "laundry",
        metadataJson: {
          serviceType: "laundry",
          serviceUnits: [{ serviceType: "laundry", spacingDays: 7, units: 4 }],
        },
        scheduledEndAt: new Date("2026-09-01T16:00:00.000Z"),
        scheduledStartAt: new Date("2026-09-01T14:00:00.000Z"),
        timingType: "scheduled",
        tipAmountCents: 0,
        totalPriceCents: 20_000,
      },
    ]);
    let orderId = 0;
    mocks.orderInsertReturning.mockImplementation(() => {
      orderId += 1;
      return [{ id: orderId, serviceType: "laundry" }];
    });

    const result = await finalizeCheckoutPayment({
      checkoutSessionId: checkoutSession.id,
      stripePaymentIntentId: "pi_subscription",
    });

    expect(result.createdOrderIds).toEqual([1, 2, 3, 4]);
    expect(mocks.dispatchOrder).toHaveBeenCalledTimes(4);
  });
});
