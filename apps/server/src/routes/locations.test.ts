import { getScheduledWindowForSlot } from "@callcastlecare/api";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../types";
import { locationRoutes } from "./locations";

const autocompleteRadarAddresses = vi.hoisted(() => vi.fn());
const findManyOrders = vi.hoisted(() => vi.fn());
const lookupPropertyWithRentCast = vi.hoisted(() => vi.fn());
const reverseGeocodeWithRadar = vi.hoisted(() => vi.fn());
const validateRadarAddress = vi.hoisted(() => vi.fn());

vi.mock("@callcastlecare/db", () => ({
  and: vi.fn(),
  db: {
    query: {
      orders: {
        findMany: findManyOrders,
      },
    },
  },
  gte: vi.fn(),
  inArray: vi.fn(),
  lt: vi.fn(),
}));

vi.mock("@callcastlecare/db/schema/index", () => ({
  orders: {
    scheduledStartAt: "scheduledStartAt",
    status: "status",
  },
}));

vi.mock("../lib/integrations/radar", () => ({
  autocompleteRadarAddresses,
  reverseGeocodeWithRadar,
  validateRadarAddress,
}));

vi.mock("../lib/integrations/rentcast", () => ({
  lookupPropertyWithRentCast,
}));

const app = new Hono<AppEnv>().route("/locations", locationRoutes);

describe("location routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyOrders.mockResolvedValue([]);
  });

  it("returns an empty autocomplete result for short input", async () => {
    const response = await app.request(
      "/locations/addresses/autocomplete?input=12"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: [] });
    expect(autocompleteRadarAddresses).not.toHaveBeenCalled();
  });

  it("returns Radar address suggestions for valid autocomplete input", async () => {
    autocompleteRadarAddresses.mockResolvedValue([
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
    expect(autocompleteRadarAddresses).toHaveBeenCalledWith("123 Main");
  });

  it("validates an address without property enrichment by default", async () => {
    validateRadarAddress.mockResolvedValue({
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
      property: null,
    });
    expect(lookupPropertyWithRentCast).not.toHaveBeenCalled();
  });

  it("validates an address and returns requested property enrichment", async () => {
    validateRadarAddress.mockResolvedValue({
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
    lookupPropertyWithRentCast.mockResolvedValue({
      fallbackUsed: false,
      homeSqft: 2200,
      lotSizeSqft: 11_000,
      raw: {},
    });

    const response = await app.request("/locations/addresses/validate", {
      body: JSON.stringify({
        address: "123 Main St, Little Rock, AR",
        includeProperty: true,
      }),
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
    expect(validateRadarAddress).not.toHaveBeenCalled();
    expect(lookupPropertyWithRentCast).not.toHaveBeenCalled();
  });

  it("reverse geocodes a current location coordinate pair", async () => {
    reverseGeocodeWithRadar.mockResolvedValue({
      city: "Searcy",
      country: "US",
      formattedAddress: "100 E Race Ave, Searcy, AR 72143, USA",
      latitude: 35.2506,
      longitude: -91.7362,
      placeId: "radar-place-123",
      raw: {},
      state: "AR",
      street: "100 E Race Ave",
      verdict: {
        hasUnconfirmedComponents: false,
        isComplete: true,
      },
      zip: "72143",
    });

    const response = await app.request(
      "/locations/addresses/reverse-geocode?latitude=35.2506&longitude=-91.7362"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      address: {
        formattedAddress: "100 E Race Ave, Searcy, AR 72143, USA",
      },
    });
    expect(reverseGeocodeWithRadar).toHaveBeenCalledWith(35.2506, -91.7362);
  });

  it("removes booked launch slots from availability", async () => {
    const scheduledWindow = getScheduledWindowForSlot(
      "2026-07-28",
      "10:00 AM - 12:00 PM"
    );
    findManyOrders.mockResolvedValue([
      {
        scheduledStartAt: new Date(scheduledWindow.scheduledStartAt),
      },
    ]);

    const response = await app.request(
      "/locations/availability?date=2026-07-28"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      availableSlots: [
        "6:00 AM - 8:00 AM",
        "8:00 AM - 10:00 AM",
        "12:00 PM - 2:00 PM",
        "2:00 PM - 4:00 PM",
        "4:00 PM - 6:00 PM",
      ],
      bookedSlots: ["10:00 AM - 12:00 PM"],
      nextAvailableSlot: "6:00 AM - 8:00 AM",
    });
  });
});
