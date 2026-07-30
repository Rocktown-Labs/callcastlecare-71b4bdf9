import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@callcastlecare/env/server", () => ({
  env: {
    RADAR_API_KEY: "prj_test_pk_123",
  },
}));

describe("Radar integration", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("calls Radar autocomplete through the api.radar.io endpoint", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          addresses: [
            {
              formattedAddress: "123 Main St, Little Rock, AR 72201, USA",
              latitude: 34.7465,
              longitude: -92.2896,
              placeId: "place-123",
            },
          ],
        },
        { status: 200 }
      )
    );

    const { autocompleteRadarAddresses } = await import("./radar");
    const suggestions = await autocompleteRadarAddresses("123 Main");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(requestUrl.origin).toBe("https://api.radar.io");
    expect(requestUrl.pathname).toBe("/v1/search/autocomplete");
    expect(requestUrl.searchParams.get("countryCode")).toBe("US");
    expect(requestUrl.searchParams.get("layers")).toBe("address");
    expect(requestUrl.searchParams.get("query")).toBe("123 Main");
    expect(init.headers).toEqual({ Authorization: "prj_test_pk_123" });
    expect(suggestions).toEqual([
      {
        formattedAddress: "123 Main St, Little Rock, AR 72201, USA",
        latitude: 34.7465,
        longitude: -92.2896,
        placeId: "place-123",
        raw: {
          formattedAddress: "123 Main St, Little Rock, AR 72201, USA",
          latitude: 34.7465,
          longitude: -92.2896,
          placeId: "place-123",
        },
      },
    ]);
  });

  it("formats full address with city, state, and zip when addressLabel is provided", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          addresses: [
            {
              addressLabel: "123 Main St",
              city: "Little Rock",
              latitude: 34.7465,
              longitude: -92.2896,
              placeId: "place-123",
              postalCode: "72201",
              stateCode: "AR",
            },
          ],
        },
        { status: 200 }
      )
    );

    const { autocompleteRadarAddresses } = await import("./radar");
    const suggestions = await autocompleteRadarAddresses("123 Main St");

    expect(suggestions[0]?.formattedAddress).toBe(
      "123 Main St, Little Rock, AR 72201"
    );
  });

  it("returns no autocomplete suggestions when Radar is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const { autocompleteRadarAddresses } = await import("./radar");
    await expect(autocompleteRadarAddresses("123 Main")).resolves.toEqual([]);
  });

  it("preserves reverse geocode failures when Radar is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const { reverseGeocodeWithRadar } = await import("./radar");
    await expect(reverseGeocodeWithRadar(35.2506, -91.7362)).rejects.toThrow(
      "fetch failed"
    );
  });
});
