import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  customerFindFirst: vi.fn(),
  dbInsert: vi.fn(),
  dbUpdate: vi.fn(),
  env: { ADMIN_EMAIL: "admin@callcastlecare.com" },
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  orderFindFirst: vi.fn(),
  outboxFindFirst: vi.fn(),
  renderActionEmail: vi.fn(),
  renderWelcomeEmail: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@callcastlecare/db", () => ({
  and: vi.fn(),
  db: {
    insert: mocks.dbInsert,
    query: {
      customers: { findFirst: mocks.customerFindFirst },
      orders: { findFirst: mocks.orderFindFirst },
      outboxEvents: { findFirst: mocks.outboxFindFirst },
    },
    update: mocks.dbUpdate,
  },
  eq: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock("@callcastlecare/db/schema/index", () => ({
  customers: { id: "id" },
  notifications: { id: "id" },
  orders: { id: "id" },
  outboxEvents: { id: "id" },
}));

vi.mock("@callcastlecare/email", () => ({
  castleCareUrl: vi.fn((path: string) => `https://callcastlecare.com${path}`),
  getEventEmailDefinition: vi.fn(() => ({
    body: "generic update",
    statusLabel: "Update",
    subject: "Update",
  })),
  getServiceStatusEmailProps: vi.fn((input: unknown) => input),
  renderActionEmail: mocks.renderActionEmail,
  renderServiceStatusUpdateEmail: vi.fn(() =>
    Promise.resolve({ html: "<p>status</p>", text: "status" })
  ),
  renderWelcomeEmail: mocks.renderWelcomeEmail,
}));

vi.mock("@callcastlecare/env/server", () => ({
  env: mocks.env,
}));

vi.mock("./integrations/email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("./logger", () => ({ logger: mocks.logger }));

const { processOutboxEvent } = await import("./notifications");

const welcomeEvent = {
  id: 9,
  payloadJson: { checkoutSessionId: 7, customerId: 22, orderId: 1 },
  status: "pending",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.outboxFindFirst.mockResolvedValue({
    eventName: "customer_welcome",
    id: 9,
    payloadJson: welcomeEvent.payloadJson,
    status: "pending",
  });
  mocks.customerFindFirst.mockResolvedValue({
    email: "taylor@example.com",
    firstName: "Taylor",
    id: 22,
  });
  mocks.dbUpdate.mockReturnValue({
    set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
  });
  mocks.dbInsert.mockReturnValue(Promise.resolve());
  mocks.renderWelcomeEmail.mockResolvedValue({
    html: "<p>welcome</p>",
    text: "welcome",
  });
  mocks.renderActionEmail.mockResolvedValue({
    html: "<p>admin</p>",
    text: "admin",
  });
  mocks.sendEmail.mockImplementation(() => Promise.resolve());
});

describe("processOutboxEvent customer_welcome", () => {
  it("sends the welcome and admin alert with stable idempotency keys", async () => {
    await processOutboxEvent(9);

    expect(mocks.renderWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "customer-welcome/22",
        subject: "Welcome to CastleCare",
        to: "taylor@example.com",
      })
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "admin-signup/22",
        subject: "New Customer Signup: Taylor",
        to: "admin@callcastlecare.com",
      })
    );
    // Welcome flow returns before the generic service-status branch, so no
    // in-app notification rows are written for it.
    expect(mocks.dbInsert).not.toHaveBeenCalled();
  });

  it("marks the event failed when welcome delivery rejects", async () => {
    mocks.sendEmail.mockRejectedValueOnce(
      new Error("Email provider rejected the message")
    );

    await processOutboxEvent(9);

    expect(mocks.dbUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ outboxEventId: 9 }),
      "outbox:processing_failed"
    );
  });

  it("marks the event sent even when the customer row is gone", async () => {
    mocks.customerFindFirst.mockResolvedValue(null);

    await processOutboxEvent(9);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.dbUpdate).toHaveBeenCalled();
  });

  it("does not run the welcome flow for other events", async () => {
    mocks.outboxFindFirst.mockResolvedValue({
      eventName: "checkout_confirmed",
      id: 10,
      payloadJson: { customerId: 22, orderId: 1 },
      status: "pending",
    });

    await processOutboxEvent(10);

    expect(mocks.renderWelcomeEmail).not.toHaveBeenCalled();
  });
});
