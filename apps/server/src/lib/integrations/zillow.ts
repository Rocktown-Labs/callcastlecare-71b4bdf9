import { env } from "@callcastlecare/env/server";

export interface ZillowPropertyData {
  fallbackUsed: boolean;
  homeSqft: number | null;
  lotSizeSqft: number | null;
  raw: Record<string, unknown>;
}

const defaultRapidApiRealtyHost = "realty-in-us.p.rapidapi.com";

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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getArray = (
  record: Record<string, unknown> | null,
  key: string
): Record<string, unknown>[] => {
  const value = record?.[key];

  return Array.isArray(value)
    ? value.flatMap((item) => {
        const itemRecord = asRecord(item);
        return itemRecord ? [itemRecord] : [];
      })
    : [];
};

const getNestedRecord = (
  record: Record<string, unknown> | null,
  path: string[]
): Record<string, unknown> | null => {
  let current = record;

  for (const key of path) {
    current = asRecord(current?.[key]);
  }

  return current;
};

const getFirstRecord = (
  record: Record<string, unknown>,
  paths: string[][]
): Record<string, unknown> | null => {
  for (const path of paths) {
    const nested = getNestedRecord(record, path);
    if (nested) {
      return nested;
    }
  }

  return null;
};

const findPropertyCandidates = (
  payload: Record<string, unknown>
): Record<string, unknown>[] => {
  const directCollections = [
    getArray(payload, "properties"),
    getArray(payload, "props"),
    getArray(payload, "results"),
    getArray(payload, "listings"),
  ].flat();

  const data = asRecord(payload.data);
  const homeSearch = getNestedRecord(payload, ["home_search"]);

  return [
    ...directCollections,
    ...getArray(data, "properties"),
    ...getArray(data, "results"),
    ...getArray(homeSearch, "results"),
  ];
};

const getPropertyId = (record: Record<string, unknown>): string | null => {
  const directId =
    record.property_id ?? record.propertyId ?? record.mpr_id ?? record.id;

  if (typeof directId === "string" || typeof directId === "number") {
    return String(directId);
  }

  const nestedListing = asRecord(record.listing);
  const nestedId = nestedListing?.property_id ?? nestedListing?.propertyId;

  return typeof nestedId === "string" || typeof nestedId === "number"
    ? String(nestedId)
    : null;
};

const getPropertyDetailsRecord = (
  payload: Record<string, unknown>
): Record<string, unknown> =>
  getFirstRecord(payload, [
    ["listing"],
    ["property"],
    ["data", "home"],
    ["data", "property"],
    ["data", "listing"],
  ]) ?? payload;

const getHomeSqft = (record: Record<string, unknown>) =>
  parsePositiveNumber(record.sqft) ??
  parsePositiveNumber(record.livingArea) ??
  parsePositiveNumber(record.homeSize) ??
  parsePositiveNumber(record.propertySize) ??
  parsePositiveNumber(asRecord(record.description)?.sqft) ??
  parsePositiveNumber(asRecord(record.building_size)?.size);

const getLotSizeSqft = (record: Record<string, unknown>) =>
  parsePositiveNumber(record.lot_sqft) ??
  parsePositiveNumber(record.lotSizeSqft) ??
  parsePositiveNumber(record.lotSize) ??
  parsePositiveNumber(record.lotAreaValue) ??
  parsePositiveNumber(asRecord(record.lot_size)?.size) ??
  parsePositiveNumber(asRecord(record.description)?.lot_sqft);

const parsePropertyData = (
  payload: Record<string, unknown>,
  propertyId?: string
): ZillowPropertyData => {
  const details = getPropertyDetailsRecord(payload);
  const homeSqft = getHomeSqft(details);
  const lotSizeSqft = getLotSizeSqft(details);

  return {
    fallbackUsed: !homeSqft || !lotSizeSqft,
    homeSqft: homeSqft ?? 2000,
    lotSizeSqft: lotSizeSqft ?? 10_000,
    raw: propertyId ? { payload, propertyId } : payload,
  };
};

const rapidApiFetch = (
  path: string,
  init: RequestInit = {}
): Promise<Response> | null => {
  if (!env.RAPIDAPI_KEY) {
    return null;
  }

  const host = env.RAPIDAPI_ZILLOW_HOST ?? defaultRapidApiRealtyHost;

  return fetch(`https://${host}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": host,
      "x-rapidapi-key": env.RAPIDAPI_KEY,
      ...init.headers,
    },
  });
};

const searchProperty = async (
  address: string
): Promise<Record<string, unknown> | null> => {
  const response = await rapidApiFetch("/properties/v3/list", {
    body: JSON.stringify({
      limit: 1,
      offset: 0,
      query: {
        address,
      },
      status: ["for_sale", "for_rent", "sold"],
    }),
    method: "POST",
  });

  if (!response?.ok) {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
};

const fetchPropertyDetails = async (
  propertyId: string
): Promise<Record<string, unknown> | null> => {
  const searchParams = new URLSearchParams({ property_id: propertyId });
  const response = await rapidApiFetch(
    `/properties/v3/detail?${searchParams.toString()}`,
    {
      method: "GET",
    }
  );

  if (!response?.ok) {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
};

export const lookupPropertyWithZillow = async (
  address: string
): Promise<ZillowPropertyData> => {
  const searchPayload = await searchProperty(address);

  if (!searchPayload) {
    return fallbackPropertyData(address, true);
  }

  const [firstProperty] = findPropertyCandidates(searchPayload);
  const propertyId = firstProperty ? getPropertyId(firstProperty) : null;

  if (!propertyId) {
    return firstProperty
      ? parsePropertyData(firstProperty)
      : parsePropertyData(searchPayload);
  }

  const detailPayload = await fetchPropertyDetails(propertyId);
  const propertyRecord = firstProperty ?? searchPayload;

  return detailPayload
    ? parsePropertyData(detailPayload, propertyId)
    : parsePropertyData(propertyRecord, propertyId);
};
