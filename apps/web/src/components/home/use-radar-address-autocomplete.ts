import { useDebouncedValue } from "@tanstack/react-pacer";
import { useEffect, useRef, useState } from "react";

import { getServerUrl } from "@/lib/server-url";

export interface RadarAddressSuggestion {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  raw: Record<string, unknown>;
}

const DEBOUNCE_MS = 300;

const toStringOrNull = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const toNumberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

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

const getSuggestionLabel = (candidate: Record<string, unknown>) =>
  toStringOrNull(candidate.formattedAddress) ??
  toStringOrNull(candidate.label) ??
  toStringOrNull(candidate.address) ??
  toStringOrNull(candidate.description);

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

export const validateAddress = async (address: string) => {
  const url = new URL("/api/locations/addresses/validate", getServerUrl());
  const payload = await fetchJson(url, {
    body: JSON.stringify({ address }),
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
    raw: candidate,
  };
};

export const reverseGeocodeAddress = async (
  latitude: number,
  longitude: number
) => {
  const url = new URL(
    "/api/locations/addresses/reverse-geocode",
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
    if (trimmed.length < 3) {
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    const url = new URL(
      "/api/locations/addresses/autocomplete",
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
    isLoading: isLoading && debouncedQuery.trim().length >= 3,
    suggestions: debouncedQuery.trim().length >= 3 ? suggestions : [],
  };
};
