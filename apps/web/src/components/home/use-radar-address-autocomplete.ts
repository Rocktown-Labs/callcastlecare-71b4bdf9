import { useDebouncedValue } from "@tanstack/react-pacer";
import { useEffect, useRef, useState } from "react";

import { getServerUrl } from "@/lib/server-url";

export interface RadarAddressSuggestion {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  market?: MarketHint | null;
  property?: PropertyEstimate;
  raw: Record<string, unknown>;
  stateCode?: string | null;
  travel?: TravelEstimateClient | null;
}

const DEBOUNCE_MS = 300;
const MIN_AUTOCOMPLETE_CHARACTERS = 5;

export interface PropertyEstimate {
  fallbackUsed: boolean;
  homeSqft: number | null;
  lotSizeSqft: number | null;
  source?: "fallback" | "rentcast";
  stories?: number | null;
}

export interface TravelEstimateClient {
  distanceMiles: number;
  driveMinutes: number;
  feeCents: number;
  feeKind: "free" | "in_state" | "out_of_state";
  inState: boolean;
  isLocal: boolean;
  prefersSubscription: boolean;
}

export interface MarketHint {
  label: string;
  mode: "on_demand" | "paused" | "subscription_first";
  stateCode: string;
}

const toStringOrNull = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const toNumberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toBoolean = (value: unknown) => value === true;

const getRawSuggestions = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as Record<string, unknown>;
  if (Array.isArray(response.suggestions)) {
    return response.suggestions;
  }
  if (Array.isArray(response.addresses)) {
    return response.addresses;
  }
  if (Array.isArray(response.results)) {
    return response.results;
  }

  return [];
};

const getSuggestionLabel = (candidate: Record<string, unknown>) => {
  const formatted =
    toStringOrNull(candidate.formattedAddress) ??
    toStringOrNull(candidate.fullAddress);
  if (formatted && formatted.includes(",")) {
    return formatted;
  }

  const street =
    toStringOrNull(candidate.addressLabel) ??
    [toStringOrNull(candidate.number), toStringOrNull(candidate.street)]
      .filter(Boolean)
      .join(" ");

  const city = toStringOrNull(candidate.city);
  const state =
    toStringOrNull(candidate.stateCode) ?? toStringOrNull(candidate.state);
  const zip =
    toStringOrNull(candidate.postalCode) ?? toStringOrNull(candidate.zip);

  const stateZip = [state, zip].filter(Boolean).join(" ");
  const cityStateZip = [city, stateZip].filter(Boolean).join(", ");

  if (street && cityStateZip) {
    return `${street}, ${cityStateZip}`;
  }

  return (
    formatted ??
    toStringOrNull(candidate.addressLabel) ??
    toStringOrNull(candidate.label) ??
    toStringOrNull(candidate.address) ??
    toStringOrNull(candidate.description)
  );
};

const getSuggestionId = (candidate: Record<string, unknown>, index: number) =>
  `${toStringOrNull(candidate.placeId) ?? toStringOrNull(candidate.id) ?? "address"}-${index}`;

export const parseRadarSuggestions = (
  payload: unknown
): RadarAddressSuggestion[] => {
  const suggestions: RadarAddressSuggestion[] = [];
  for (const [index, rawSuggestion] of getRawSuggestions(payload).entries()) {
    if (!rawSuggestion || typeof rawSuggestion !== "object") {
      continue;
    }

    const candidate = rawSuggestion as Record<string, unknown>;
    const label = getSuggestionLabel(candidate);
    if (!label) {
      continue;
    }

    suggestions.push({
      id: getSuggestionId(candidate, index),
      label,
      latitude:
        toNumberOrNull(candidate.latitude) ??
        toNumberOrNull(candidate.lat) ??
        null,
      longitude:
        toNumberOrNull(candidate.longitude) ??
        toNumberOrNull(candidate.lng) ??
        null,
      raw: candidate,
    });
  }

  return suggestions;
};

const fetchJson = async (url: URL, init?: RequestInit) => {
  const response = await fetch(url, init);

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<unknown>;
};

const parseTravel = (raw: unknown): TravelEstimateClient | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  return {
    distanceMiles: toNumberOrNull(obj.distanceMiles) ?? 0,
    driveMinutes: toNumberOrNull(obj.driveMinutes) ?? 0,
    feeCents: toNumberOrNull(obj.feeCents) ?? 0,
    feeKind: (obj.feeKind as "free" | "in_state" | "out_of_state") ?? "free",
    inState: toBoolean(obj.inState),
    isLocal: toBoolean(obj.isLocal),
    prefersSubscription: toBoolean(obj.prefersSubscription),
  };
};

const parseMarket = (raw: unknown): MarketHint | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  return {
    label: toStringOrNull(obj.label) ?? "Market",
    mode:
      (obj.mode as "on_demand" | "paused" | "subscription_first") ??
      "subscription_first",
    stateCode: toStringOrNull(obj.stateCode) ?? "",
  };
};

const parseProperty = (raw: unknown): PropertyEstimate | undefined => {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  return {
    fallbackUsed: toBoolean(obj.fallbackUsed),
    homeSqft: toNumberOrNull(obj.homeSqft),
    lotSizeSqft: toNumberOrNull(obj.lotSizeSqft),
    source: obj.source === "rentcast" ? "rentcast" : "fallback",
    stories: toNumberOrNull(obj.stories),
  };
};

export const validateAddress = async (
  address: string,
  options: { includeProperty?: boolean } = {}
): Promise<RadarAddressSuggestion | null> => {
  const url = new URL("/api/v1/locations/addresses/validate", getServerUrl());
  const payload = await fetchJson(url, {
    body: JSON.stringify({
      address,
      includeProperty: options.includeProperty === true,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as Record<string, unknown>;
  const rawAddress = response.address;
  if (!rawAddress || typeof rawAddress !== "object") {
    return null;
  }

  const candidate = rawAddress as Record<string, unknown>;
  const label = toStringOrNull(candidate.formattedAddress);
  if (!label) {
    return null;
  }

  return {
    id: toStringOrNull(candidate.placeId) ?? `validated-${label}`,
    label,
    latitude: toNumberOrNull(candidate.latitude),
    longitude: toNumberOrNull(candidate.longitude),
    market: parseMarket(response.market),
    property: parseProperty(response.property),
    raw: candidate,
    stateCode: toStringOrNull(candidate.state),
    travel: parseTravel(response.travel),
  };
};

export const reverseGeocodeAddress = async (
  latitude: number,
  longitude: number
): Promise<RadarAddressSuggestion> => {
  const url = new URL(
    "/api/v1/locations/addresses/reverse-geocode",
    getServerUrl()
  );
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));

  const payload = await fetchJson(url);
  if (payload && typeof payload === "object") {
    const response = payload as Record<string, unknown>;
    const rawAddress = response.address;
    if (rawAddress && typeof rawAddress === "object") {
      const candidate = rawAddress as Record<string, unknown>;
      const label = toStringOrNull(candidate.formattedAddress);
      if (label) {
        const validated = await validateAddress(label);
        if (validated) {
          return validated;
        }

        return {
          id: toStringOrNull(candidate.placeId) ?? `validated-${label}`,
          label,
          latitude: toNumberOrNull(candidate.latitude),
          longitude: toNumberOrNull(candidate.longitude),
          raw: candidate,
        };
      }
    }
  }

  throw new Error("Unable to reverse geocode current location.");
};

export const useRadarAddressAutocomplete = (query: string) => {
  const [debouncedQuery] = useDebouncedValue(query, { wait: DEBOUNCE_MS });
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RadarAddressSuggestion[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < MIN_AUTOCOMPLETE_CHARACTERS) {
      requestIdRef.current += 1;
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    const url = new URL(
      "/api/v1/locations/addresses/autocomplete",
      getServerUrl()
    );
    url.searchParams.set("input", trimmed);

    const search = async () => {
      setIsLoading(true);

      try {
        const payload = await fetchJson(url);
        if (requestIdRef.current === currentRequestId) {
          setSuggestions(parseRadarSuggestions(payload));
        }
      } catch {
        if (requestIdRef.current === currentRequestId) {
          setSuggestions([]);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
        }
      }
    };

    void search();
  }, [debouncedQuery]);

  return {
    isEnabled: true,
    isLoading:
      isLoading && debouncedQuery.trim().length >= MIN_AUTOCOMPLETE_CHARACTERS,
    suggestions:
      debouncedQuery.trim().length >= MIN_AUTOCOMPLETE_CHARACTERS
        ? suggestions
        : [],
  };
};
