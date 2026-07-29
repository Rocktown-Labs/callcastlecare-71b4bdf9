import { env } from "@callcastlecare/env/server";

export interface PropertyLookupData {
  fallbackUsed: boolean;
  homeSqft: number | null;
  lotSizeSqft: number | null;
  raw: Record<string, unknown>;
  source: "fallback" | "rentcast";
  stories: number | null;
}

const rentcastPropertiesUrl = "https://api.rentcast.io/v1/properties";

const fallbackPropertyData = (
  address: string,
  fallbackReason: string
): PropertyLookupData => ({
  fallbackUsed: true,
  homeSqft: null,
  lotSizeSqft: null,
  raw: {
    address,
    fallbackReason,
    source: "fallback",
  },
  source: "fallback",
  stories: null,
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getPropertyRecord = (
  payload: unknown
): Record<string, unknown> | null => {
  if (Array.isArray(payload)) {
    return asRecord(payload[0]);
  }

  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const { data } = record;
  if (Array.isArray(data)) {
    return asRecord(data[0]);
  }

  if (Array.isArray(record.properties)) {
    return asRecord(record.properties[0]);
  }

  return record;
};

const parseRentCastProperty = (
  record: Record<string, unknown>
): PropertyLookupData => {
  const features = asRecord(record.features);
  const homeSqft = parsePositiveNumber(record.squareFootage);
  const lotSizeSqft = parsePositiveNumber(record.lotSize);
  const stories = parsePositiveNumber(features?.floorCount);

  return {
    fallbackUsed: !lotSizeSqft,
    homeSqft,
    lotSizeSqft,
    raw: record,
    source: "rentcast",
    stories,
  };
};

export const lookupPropertyWithRentCast = async (
  address: string
): Promise<PropertyLookupData> => {
  if (!env.RENTCAST_API_KEY) {
    return fallbackPropertyData(address, "missing_api_key");
  }

  const url = new URL(rentcastPropertiesUrl);
  url.searchParams.set("address", address);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": env.RENTCAST_API_KEY,
      },
      method: "GET",
    });

    if (!response.ok) {
      return fallbackPropertyData(address, `http_${response.status}`);
    }

    const property = getPropertyRecord(await response.json());
    if (!property) {
      return fallbackPropertyData(address, "no_property_record");
    }

    return parseRentCastProperty(property);
  } catch {
    return fallbackPropertyData(address, "fetch_failed");
  }
};
