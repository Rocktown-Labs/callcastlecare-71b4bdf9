import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";
import { locationRoutes } from "./locations";

const autocompleteGoogleAddresses = vi.hoisted(() => vi.fn());
const lookupPropertyWithZillow = vi.hoisted(() => vi.fn());
const validateGoogleAddress = vi.hoisted(() => vi.fn());

vi.mock("../lib/integrations/google-maps", () => ({
  autocompleteGoogleAddresses,
  validateGoogleAddress,
}));

vi.mock("../lib/integrations/zillow", () => ({
  lookupPropertyWithZillow,
}));

const app = new Hono<AppEnv>().route("/locations", locationRoutes);

describe("location routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty autocomplete result for short input", async () => {
    const response = await app.request(
      "/locations/addresses/autocomplete?input=12"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: [] });
    expect(autocompleteGoogleAddresses).not.toHaveBeenCalled();
  });

  it("returns Google address suggestions for valid autocomplete input", async () => {
    autocompleteGoogleAddresses.mockResolvedValue([
      {
        formattedAddress: "123 Main St, Little Rock, AR 72201, USA",
        placeId: "place-123",
      },
    ]);

    const response = await app.request(
      "/locations/addresses/autocomplete?input=123%20Main"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [
        {
          formattedAddress: "123 Main St, Little Rock, AR 72201, USA",
          placeId: "place-123",
        },
      ],
    });
    expect(autocompleteGoogleAddresses).toHaveBeenCalledWith("123 Main");
  });

  it("validates an address and returns property enrichment", async () => {
    validateGoogleAddress.mockResolvedValue({
      city: "Little Rock",
      country: "US",
      formattedAddress: "123 Main St, Little Rock, AR 72201, USA",
      latitude: 34.7465,
      longitude: -92.2896,
      placeId: "place-123",
      raw: {},
      state: "AR",
      street: "123 Main St",
      verdict: {
        hasUnconfirmedComponents: false,
        isComplete: true,
      },
      zip: "72201",
    });
    lookupPropertyWithZillow.mockResolvedValue({
      fallbackUsed: false,
      homeSqft: 2200,
      lotSizeSqft: 11_000,
      raw: {},
    });

    const response = await app.request("/locations/addresses/validate", {
      body: JSON.stringify({ address: "123 Main St, Little Rock, AR" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      address: {
        formattedAddress: "123 Main St, Little Rock, AR 72201, USA",
      },
      property: {
        homeSqft: 2200,
        lotSizeSqft: 11_000,
      },
    });
  });

  it("rejects invalid address validation payloads", async () => {
    const response = await app.request("/locations/addresses/validate", {
      body: JSON.stringify({ address: "x" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(validateGoogleAddress).not.toHaveBeenCalled();
    expect(lookupPropertyWithZillow).not.toHaveBeenCalled();
  });
});
