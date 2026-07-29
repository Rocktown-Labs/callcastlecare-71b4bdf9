import { beforeEach, describe, expect, it, vi } from "vitest";

const envValues = vi.hoisted(() => ({
  RENTCAST_API_KEY: "test-rentcast-key",
}));

vi.mock("@callcastlecare/env/server", () => ({
  env: envValues,
}));

const { lookupPropertyWithRentCast } = await import("./rentcast");

describe("lookupPropertyWithRentCast", () => {
  beforeEach(() => {
    envValues.RENTCAST_API_KEY = "test-rentcast-key";
    vi.restoreAllMocks();
  });

  it("falls back without calling RentCast when the API key is missing", async () => {
    envValues.RENTCAST_API_KEY = "";
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await lookupPropertyWithRentCast(
      "123 Main St, Little Rock, AR 72201"
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fallbackUsed: true,
      homeSqft: null,
      lotSizeSqft: null,
      source: "fallback",
    });
  });

  it("retrieves a single property by exact address and parses lot size", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json(
        [
          {
            features: {
              floorCount: 1,
            },
            formattedAddress: "13 Cloverdale Blvd, Searcy, AR 72143",
            lotSize: 21_780,
            squareFootage: 1850,
          },
        ],
        { status: 200 }
      )
    );

    const result = await lookupPropertyWithRentCast(
      "13 Cloverdale Blvd, Searcy, AR 72143"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe("https://api.rentcast.io");
    expect(url.pathname).toBe("/v1/properties");
    expect(url.searchParams.get("address")).toBe(
      "13 Cloverdale Blvd, Searcy, AR 72143"
    );
    expect(init.headers).toEqual({
      Accept: "application/json",
      "X-Api-Key": "test-rentcast-key",
    });
    expect(result).toMatchObject({
      fallbackUsed: false,
      homeSqft: 1850,
      lotSizeSqft: 21_780,
      source: "rentcast",
      stories: 1,
    });
  });

  it("falls back when RentCast has no matching property", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ message: "No results" }, { status: 404 })
    );

    const result = await lookupPropertyWithRentCast(
      "999 Unknown St, Little Rock, AR"
    );

    expect(result).toMatchObject({
      fallbackUsed: true,
      lotSizeSqft: null,
      source: "fallback",
    });
  });
});
