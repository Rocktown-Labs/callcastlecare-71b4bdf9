import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  constructEvent: vi.fn(),
  env: {
    NODE_ENV: "test",
    STRIPE_SECRET_KEY: undefined as string | undefined,
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  },
}));

vi.mock("@callcastlecare/env/server", () => ({
  env: mocks.env,
}));

vi.mock("stripe", () => ({
  default: vi.fn(
    class Stripe {
      checkout = {
        sessions: {
          create: mocks.checkoutCreate,
        },
      };
      webhooks = {
        constructEvent: mocks.constructEvent,
      };
    }
  ),
}));

describe("createStripeCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.NODE_ENV = "test";
    mocks.env.STRIPE_SECRET_KEY = undefined;
    mocks.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.checkoutCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    mocks.constructEvent.mockReturnValue({
      data: {
        object: {
          id: "cs_test_123",
        },
      },
      id: "evt_test_123",
      type: "checkout.session.completed",
    });
  });

  it("returns a mock checkout session when Stripe is intentionally unconfigured", async () => {
    const { createStripeCheckoutSession } = await import("./stripe-payments");

    const session = await createStripeCheckoutSession({
      amountDueCents: 5000,
      cancelUrl: "https://callcastlecare.com/book?checkout=cancelled",
      checkoutSessionId: 42,
      customerEmail: "customer@example.com",
      metadata: {
        checkoutSessionId: "42",
      },
      successUrl:
        "https://callcastlecare.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    });

    expect(session.id).toMatch(/^cs_mock_42_/u);
    expect(session.url).toContain("/checkout/success?session_id=cs_mock_");
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("passes Stripe Checkout params with metadata", async () => {
    mocks.env.STRIPE_SECRET_KEY = "sk_test_real_key";
    const { createStripeCheckoutSession } = await import("./stripe-payments");

    const session = await createStripeCheckoutSession({
      amountDueCents: 5000,
      cancelUrl: "https://callcastlecare.com/book?checkout=cancelled",
      checkoutSessionId: 42,
      customerEmail: "customer@example.com",
      metadata: {
        checkoutSessionId: "42",
        paymentOption: "deposit_invoice",
      },
      successUrl:
        "https://callcastlecare.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    });

    expect(session).toEqual({
      id: "cs_test_123",
      mode: "payment",
      subscriptionId: null,
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "customer@example.com",
        metadata: {
          checkoutSessionId: "42",
          paymentOption: "deposit_invoice",
        },
        mode: "payment",
        payment_intent_data: {
          metadata: {
            checkoutSessionId: "42",
            paymentOption: "deposit_invoice",
          },
        },
        success_url:
          "https://callcastlecare.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );
  });

  it("creates subscription-mode Checkout with synced recurring prices", async () => {
    mocks.env.STRIPE_SECRET_KEY = "sk_test_real_key";
    mocks.checkoutCreate.mockResolvedValue({
      id: "cs_subscription_123",
      subscription: "sub_123",
      url: "https://checkout.stripe.com/c/pay/cs_subscription_123",
    });
    const { createStripeCheckoutSession } = await import("./stripe-payments");

    const session = await createStripeCheckoutSession({
      amountDueCents: 25_000,
      cancelUrl: "https://callcastlecare.com/book?checkout=cancelled",
      checkoutSessionId: 43,
      customerEmail: "customer@example.com",
      lineItems: [
        {
          name: "Bi-Weekly Royal Duo",
          priceId: "price_duo_monthly",
        },
      ],
      metadata: {
        checkoutMode: "subscription",
        checkoutSessionId: "43",
      },
      mode: "subscription",
      stripeCustomerId: "cus_123",
      subscriptionMetadata: {
        checkoutSessionId: "43",
        planIds: "bi-weekly-royal-duo-small",
      },
      successUrl:
        "https://callcastlecare.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    });

    expect(session).toEqual({
      id: "cs_subscription_123",
      mode: "subscription",
      subscriptionId: "sub_123",
      url: "https://checkout.stripe.com/c/pay/cs_subscription_123",
    });
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        line_items: [{ price: "price_duo_monthly", quantity: 1 }],
        mode: "subscription",
        subscription_data: {
          metadata: {
            checkoutSessionId: "43",
            planIds: "bi-weekly-royal-duo-small",
          },
        },
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );
  });

  it("uses the configured Stripe webhook secret when parsing checkout webhooks", async () => {
    mocks.env.STRIPE_SECRET_KEY = "sk_test_real_key";
    const { parseStripeWebhookEvent } = await import("./stripe-payments");

    const event = parseStripeWebhookEvent({
      rawBody: '{"id":"evt_test_123"}',
      signatureHeader: "t=1,v1=test",
    });

    expect(event?.id).toBe("evt_test_123");
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      '{"id":"evt_test_123"}',
      "t=1,v1=test",
      "whsec_test"
    );
  });
});
