import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emailSend: vi.fn(),
  env: { RESEND_API_KEY: undefined as string | undefined },
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock("@callcastlecare/env/server", () => ({ env: mocks.env }));
vi.mock("../logger", () => ({ logger: mocks.logger }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.emailSend };
  },
}));

const { sendEmail } = await import("./email");

const emailInput = {
  html: "<p>hello</p>",
  idempotencyKey: "test/email",
  subject: "Test email",
  text: "hello",
  to: "customer@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.RESEND_API_KEY = undefined;
});

describe("sendEmail", () => {
  it("rejects when email delivery is not configured", async () => {
    await expect(sendEmail(emailInput)).rejects.toThrow(
      "Email delivery is not configured"
    );
  });

  it("rejects provider failures so outbox events can retry", async () => {
    mocks.env.RESEND_API_KEY = "re_test_key";
    mocks.emailSend.mockResolvedValue({
      data: null,
      error: { message: "provider unavailable", name: "rate_limit" },
    });

    await expect(sendEmail(emailInput)).rejects.toThrow(
      "Email provider rejected the message"
    );
  });
});
