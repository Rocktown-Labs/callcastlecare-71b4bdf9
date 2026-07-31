import { SERVICE_HQ } from "@callcastlecare/api";
import { env } from "@callcastlecare/env/server";

import { logger } from "../logger";

export interface RadarAddressSuggestion {
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  raw: Record<string, unknown>;
}

export interface VerifiedAddress {
  city: string;
  country: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  raw: Record<string, unknown>;
  state: string;
  street: string;
  verdict: {
    hasUnconfirmedComponents: boolean;
    isComplete: boolean;
    verificationStatus: string | null;
  };
  zip: string;
}

const parseAddressFromInput = (input: string): VerifiedAddress => {
  const segments = input.split(",").map((segment) => segment.trim());
  const [street = input, city = "Unknown", stateZip = "AR 00000"] = segments;
  const stateZipParts = stateZip.split(/\s+/u).filter(Boolean);
  const [state = "VA", zip = "00000"] = stateZipParts;

  return {
    city,
    country: "US",
    formattedAddress: input,
    latitude: null,
    longitude: null,
    placeId: null,
    raw: { fallback: true, input },
    state,
    street,
    verdict: {
      hasUnconfirmedComponents: true,
      isComplete: false,
      verificationStatus: null,
    },
    zip,
  };
};

const toStringOrNull = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const toNumberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toBoolean = (value: unknown) => value === true;

const getRadarHeaders = () => ({
  Authorization: env.RADAR_API_KEY ?? "",
});

const RADAR_API_BASE_URL = "https://api.radar.io";
const MIN_AUTOCOMPLETE_CHARACTERS = 5;
const DEFAULT_NEAR = `${SERVICE_HQ.latitude},${SERVICE_HQ.longitude}`;

interface RadarGetOptions {
  returnNullOnFailure?: boolean;
}

const radarGet = async (
  path: string,
  searchParams: URLSearchParams,
  options: RadarGetOptions = {}
) => {
  if (!env.RADAR_API_KEY) {
    return null;
  }

  const url = new URL(path, RADAR_API_BASE_URL);
  for (const [key, value] of searchParams) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: getRadarHeaders(),
      method: "GET",
    });
  } catch (error) {
    logger.error(
      {
        err: error,
        path,
        vendor: "radar",
      },
      "radar:request_failed"
    );

    if (options.returnNullOnFailure) {
      return null;
    }

    throw error;
  }

  if (!response.ok) {
    logger.warn(
      {
        path,
        status: response.status,
        statusText: response.statusText,
        vendor: "radar",
      },
      "radar:request_unsuccessful"
    );

    if (!options.returnNullOnFailure) {
      throw new Error(`Radar request failed with status ${response.status}`);
    }

    return null;
  }

  return response.json() as Promise<Record<string, unknown>>;
};

const getAddressList = (payload: Record<string, unknown> | null) =>
  Array.isArray(payload?.addresses)
    ? (payload.addresses as Record<string, unknown>[])
    : [];

const getAddressLabel = (address: Record<string, unknown>) => {
  const formatted =
    toStringOrNull(address.formattedAddress) ??
    toStringOrNull(address.fullAddress);
  if (formatted && formatted.includes(",")) {
    return formatted;
  }

  const street =
    toStringOrNull(address.addressLabel) ??
    [toStringOrNull(address.number), toStringOrNull(address.street)]
      .filter(Boolean)
      .join(" ");

  const city = toStringOrNull(address.city);
  const state =
    toStringOrNull(address.stateCode) ?? toStringOrNull(address.state);
  const zip = toStringOrNull(address.postalCode) ?? toStringOrNull(address.zip);

  const stateZip = [state, zip].filter(Boolean).join(" ");
  const cityStateZip = [city, stateZip].filter(Boolean).join(", ");

  if (street && cityStateZip) {
    return `${street}, ${cityStateZip}`;
  }

  return (
    formatted ??
    toStringOrNull(address.addressLabel) ??
    [
      toStringOrNull(address.number),
      toStringOrNull(address.street),
      city,
      state,
      zip,
    ]
      .filter(Boolean)
      .join(", ")
  );
};

const toSuggestion = (
  address: Record<string, unknown>
): RadarAddressSuggestion | null => {
  const formattedAddress = getAddressLabel(address);
  if (!formattedAddress) {
    return null;
  }

  return {
    formattedAddress,
    latitude: toNumberOrNull(address.latitude),
    longitude: toNumberOrNull(address.longitude),
    placeId: toStringOrNull(address.placeId) ?? toStringOrNull(address.id),
    raw: address,
  };
};

const toVerifiedAddress = (
  input: string,
  payload: Record<string, unknown> | null
) => {
  const [first] = getAddressList(payload);
  if (!first) {
    return parseAddressFromInput(input);
  }

  const formattedAddress = getAddressLabel(first) || input;
  const verificationStatus =
    toStringOrNull(first.verificationStatus) ??
    toStringOrNull(first.verdict) ??
    null;
  const isComplete =
    toBoolean(first.complete) ||
    toBoolean(first.addressComplete) ||
    verificationStatus === "verified";

  return {
    city: toStringOrNull(first.city) ?? "Unknown",
    country: toStringOrNull(first.countryCode) ?? "US",
    formattedAddress,
    latitude: toNumberOrNull(first.latitude),
    longitude: toNumberOrNull(first.longitude),
    placeId: toStringOrNull(first.placeId) ?? toStringOrNull(first.id),
    raw: (payload ?? first) as Record<string, unknown>,
    state: toStringOrNull(first.stateCode) ?? "AR",
    street:
      [toStringOrNull(first.number), toStringOrNull(first.street)]
        .filter(Boolean)
        .join(" ") ||
      toStringOrNull(first.street) ||
      formattedAddress,
    verdict: {
      hasUnconfirmedComponents: !isComplete,
      isComplete,
      verificationStatus,
    },
    zip: toStringOrNull(first.postalCode) ?? "00000",
  } satisfies VerifiedAddress;
};

export const autocompleteRadarAddresses = async (
  input: string
): Promise<RadarAddressSuggestion[]> => {
  const trimmed = input.trim();
  if (trimmed.length < MIN_AUTOCOMPLETE_CHARACTERS) {
    return [];
  }

  const payload = await radarGet(
    "/v1/search/autocomplete",
    new URLSearchParams({
      countryCode: "US",
      layers: "address",
      limit: "8",
      near: DEFAULT_NEAR,
      query: trimmed,
    }),
    { returnNullOnFailure: true }
  );

  return getAddressList(payload)
    .map(toSuggestion)
    .filter((suggestion): suggestion is RadarAddressSuggestion =>
      Boolean(suggestion)
    );
};

export const reverseGeocodeWithRadar = async (
  latitude: number,
  longitude: number
): Promise<VerifiedAddress> => {
  const payload = await radarGet(
    "/v1/geocode/reverse",
    new URLSearchParams({
      coordinates: `${latitude},${longitude}`,
    })
  );

  if (!payload) {
    throw new Error("Radar reverse geocode returned no address");
  }

  return toVerifiedAddress(`${latitude}, ${longitude}`, payload);
};

const forwardGeocodeWithRadar = (input: string) =>
  radarGet(
    "/v1/geocode/forward",
    new URLSearchParams({
      query: input.trim(),
    })
  );

export const validateRadarAddress = async (
  input: string
): Promise<VerifiedAddress> => {
  const trimmed = input.trim();
  if (trimmed.length < 5) {
    return parseAddressFromInput(input);
  }

  try {
    const coordinateMatch = trimmed.match(
      /^\s*(?<latitude>-?\d+(?:\.\d+)?)\s*,\s*(?<longitude>-?\d+(?:\.\d+)?)\s*$/u
    );
    if (coordinateMatch) {
      const { latitude, longitude } = coordinateMatch.groups ?? {};
      return await reverseGeocodeWithRadar(Number(latitude), Number(longitude));
    }

    const autocompletePayload = await radarGet(
      "/v1/search/autocomplete",
      new URLSearchParams({
        countryCode: "US",
        layers: "address",
        limit: "1",
        near: DEFAULT_NEAR,
        query: trimmed,
      }),
      { returnNullOnFailure: true }
    );

    const payload =
      getAddressList(autocompletePayload).length > 0
        ? autocompletePayload
        : await forwardGeocodeWithRadar(trimmed);

    const [first] = getAddressList(payload);
    if (!first) {
      return parseAddressFromInput(input);
    }

    const verified = toVerifiedAddress(trimmed, payload);
    return {
      ...verified,
      raw: {
        search: payload,
      },
    };
  } catch (error) {
    logger.warn(
      {
        err: error,
        input,
        vendor: "radar",
      },
      "radar:validate_address_fallback"
    );
    return parseAddressFromInput(input);
  }
};

export const verifyAddressWithRadar = validateRadarAddress;
