import { env } from "@callcastlecare/env/server";

export interface VerifiedAddress {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  raw: Record<string, unknown>;
  state: string;
  street: string;
  zip: string;
}

const parseAddressFromInput = (input: string): VerifiedAddress => {
  const segments = input.split(",").map((segment) => segment.trim());
  const [street = input, city = "Unknown", stateZip = "VA 00000"] = segments;
  const stateZipParts = stateZip.split(/\s+/).filter(Boolean);
  const [state = "VA", zip = "00000"] = stateZipParts;

  return {
    city,
    country: "US",
    latitude: null,
    longitude: null,
    raw: { fallback: true, input },
    state,
    street,
    zip,
  };
};

export const verifyAddressWithRadar = async (
  input: string
): Promise<VerifiedAddress> => {
  if (!env.RADAR_API_KEY) {
    return parseAddressFromInput(input);
  }

  const query = encodeURIComponent(input);
  const response = await fetch(
    `https://api.radar.com/v1/geocode/forward?query=${query}`,
    {
      headers: {
        Authorization: env.RADAR_API_KEY,
      },
      method: "GET",
    }
  );

  if (!response.ok) {
    return parseAddressFromInput(input);
  }

  const payload = (await response.json()) as {
    addresses?: {
      city?: string;
      countryCode?: string;
      latitude?: number;
      longitude?: number;
      postalCode?: string;
      stateCode?: string;
      street?: string;
    }[];
  };

  const first = payload.addresses?.[0];
  if (!first) {
    return parseAddressFromInput(input);
  }

  return {
    city: first.city ?? "Unknown",
    country: first.countryCode ?? "US",
    latitude: first.latitude ?? null,
    longitude: first.longitude ?? null,
    raw: payload as Record<string, unknown>,
    state: first.stateCode ?? "VA",
    street: first.street ?? input,
    zip: first.postalCode ?? "00000",
  };
};
