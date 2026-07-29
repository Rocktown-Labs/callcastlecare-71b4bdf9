import { beforeEach, describe, expect, it, vi } from "vitest";

const envValues = vi.hoisted(() => ({
  RAPIDAPI_KEY: "test-rapidapi-key",
  RAPIDAPI_ZILLOW_HOST: undefined as string | undefined,
}));

vi.mock("@callcastlecare/env/server", () => ({
  env: envValues,
}));

const { lookupPropertyWithZillow } = await import("./zillow");

const jsonResponse = (body: Record<string, unknown>, init?: ResponseInit) =>
  Response.json(body, {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init,
  });

describe("lookupPropertyWithZillow", () => {
  beforeEach(() => {
    envValues.RAPIDAPI_KEY = "test-rapidapi-key";
    envValues.RAPIDAPI_ZILLOW_HOST = undefined;
    vi.restoreAllMocks();
  });

  it("falls back when RapidAPI is not configured", async () => {
    envValues.RAPIDAPI_KEY = "";
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await lookupPropertyWithZillow("123 Main St, Little Rock");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fallbackUsed: true,
      homeSqft: 2000,
      lotSizeSqft: 10_000,
    });
  });

  it("searches the Realty API, loads detail by property_id, and parses sizes", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          properties: [{ property_id: "987654321" }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          listing: {
            lot_sqft: 9000,
            sqft: 1600,
          },
        })
      );

    const result = await lookupPropertyWithZillow("123 Main St, Little Rock");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://realty-in-us.p.rapidapi.com/properties/v3/list",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-rapidapi-host": "realty-in-us.p.rapidapi.com",
          "x-rapidapi-key": "test-rapidapi-key",
        }),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://realty-in-us.p.rapidapi.com/properties/v3/detail?property_id=987654321",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(result).toMatchObject({
      fallbackUsed: false,
      homeSqft: 1600,
      lotSizeSqft: 9000,
    });
  });

  it("parses available search payload sizes when a property id is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        properties: [
          {
            livingArea: "1,850",
            lotSize: "8,500",
          },
        ],
      })
    );

    const result = await lookupPropertyWithZillow("123 Main St, Little Rock");

    expect(result).toMatchObject({
      fallbackUsed: false,
      homeSqft: 1850,
      lotSizeSqft: 8500,
    });
  });
});
