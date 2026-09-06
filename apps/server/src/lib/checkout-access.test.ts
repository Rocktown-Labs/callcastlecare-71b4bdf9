import { describe, expect, it, vi } from "vitest";

import {
  createCheckoutAccessToken,
  readCheckoutAccessToken,
} from "./checkout-access";

const secret = "checkout-access-test-secret-32-characters";

describe("checkout access tokens", () => {
  it("round-trips an opaque checkout session claim", () => {
    const token = createCheckoutAccessToken(42, secret);

    expect(token).not.toContain("42");
    expect(readCheckoutAccessToken(token, secret)).toMatchObject({
      checkoutSessionId: 42,
    });
  });

  it("rejects tampered and expired tokens", () => {
    const token = createCheckoutAccessToken(42, secret);
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(readCheckoutAccessToken(tamperedToken, secret)).toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);
    expect(readCheckoutAccessToken(token, secret)).toBeNull();
    vi.useRealTimers();
  });
});
