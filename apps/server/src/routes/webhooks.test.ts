import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";
import { webhookRoutes } from "./webhooks";

const mocks = vi.hoisted(() => ({
  env: {
    RESEND_API_KEY: "re_test",
    RESEND_WEBHOOK_SECRET: "whsec_test",
  },
  verify: vi.fn(),
}));

vi.mock("@callcastlecare/env/server", () => ({
  env: mocks.env,
}));

vi.mock("resend", () => ({
  Resend: class Resend {
    webhooks = {
      verify: mocks.verify,
    };
  },
}));

const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("requestId", "test-request");
    c.set("user", null);
    c.set("session", null);
    return await next();
  })
  .route("/webhooks", webhookRoutes);

describe("resend webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  });

  it("rejects requests missing svix signature headers", async () => {
    const response = await app.request("/webhooks/resend", {
      body: "{}",
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("acknowledges verified resend email events", async () => {
    mocks.verify.mockReturnValue({
      created_at: "2026-07-29T22:00:00.000Z",
      data: {
        created_at: "2026-07-29T22:00:00.000Z",
        email_id: "email_123",
        from: "CastleCare <noreply@info.callcastlecare.com>",
        subject: "Verify your CastleCare email",
        to: ["customer@example.com"],
      },
      type: "email.delivered",
    });

    const response = await app.request("/webhooks/resend", {
      body: '{"type":"email.delivered"}',
      headers: {
        "svix-id": "msg_test",
        "svix-signature": "v1,test",
        "svix-timestamp": "1790000000",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.verify).toHaveBeenCalledWith({
      headers: {
        id: "msg_test",
        signature: "v1,test",
        timestamp: "1790000000",
      },
      payload: '{"type":"email.delivered"}',
      webhookSecret: "whsec_test",
    });
  });

  it("rejects invalid signatures", async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const response = await app.request("/webhooks/resend", {
      body: '{"type":"email.delivered"}',
      headers: {
        "svix-id": "msg_test",
        "svix-signature": "v1,bad",
        "svix-timestamp": "1790000000",
      },
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid Resend webhook signature",
    });
  });
});
