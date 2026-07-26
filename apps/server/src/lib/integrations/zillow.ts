import { env } from "@callcastlecare/env/server";

export interface ZillowPropertyData {
  fallbackUsed: boolean;
  homeSqft: number | null;
  lotSizeSqft: number | null;
  raw: Record<string, unknown>;
}

const fallbackPropertyData = (
  address: string,
  fallbackUsed: boolean
): ZillowPropertyData => ({
  fallbackUsed,
  homeSqft: 2000,
  lotSizeSqft: 10_000,
  raw: {
    address,
    fallbackUsed,
    source: "fallback",
  },
});

const parsePositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return null;
};

export const lookupPropertyWithZillow = async (
  address: string
): Promise<ZillowPropertyData> => {
  if (!env.RAPIDAPI_KEY || !env.RAPIDAPI_ZILLOW_HOST) {
    return fallbackPropertyData(address, true);
  }

  const encodedAddress = encodeURIComponent(address);
  const response = await fetch(
    `https://${env.RAPIDAPI_ZILLOW_HOST}/propertyExtendedSearch?location=${encodedAddress}`,
    {
      headers: {
        "x-rapidapi-host": env.RAPIDAPI_ZILLOW_HOST,
        "x-rapidapi-key": env.RAPIDAPI_KEY,
      },
      method: "GET",
    }
  );

  if (!response.ok) {
    return fallbackPropertyData(address, true);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const results = Array.isArray(payload.props)
    ? (payload.props as Record<string, unknown>[])
    : [];
  const first = results[0];

  if (!first) {
    return fallbackPropertyData(address, true);
  }

  const homeSqft =
    parsePositiveNumber(first.livingArea) ??
    parsePositiveNumber(first.homeSize) ??
    parsePositiveNumber(first.propertySize);
  const lotSizeSqft =
    parsePositiveNumber(first.lotAreaValue) ??
    parsePositiveNumber(first.lotSize) ??
    parsePositiveNumber(first.lotAreaUnit);

  return {
    fallbackUsed: !homeSqft || !lotSizeSqft,
    homeSqft: homeSqft ?? 2000,
    lotSizeSqft: lotSizeSqft ?? 10_000,
    raw: payload,
  };
};
