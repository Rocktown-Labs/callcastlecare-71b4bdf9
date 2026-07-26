import { useEffect, useMemo, useRef, useState } from "react";

export interface RadarAddressSuggestion {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  raw: Record<string, unknown>;
}

const RADAR_AUTOCOMPLETE_URL = "https://api.radar.io/v1/search/autocomplete";
const RADAR_REVERSE_GEOCODE_URL = "https://api.radar.io/v1/geocode/reverse";
const DEBOUNCE_MS = 300;

const getRadarPublishableKey = () =>
  import.meta.env.VITE_RADAR_PUBLISHABLE_KEY as string | undefined;

const toStringOrNull = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const toNumberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getSuggestionLabel = (candidate: Record<string, unknown>) => {
  const preferredKeys = [
    "formattedAddress",
    "formatted_address",
    "addressLabel",
    "display_name",
  ] as const;

  for (const key of preferredKeys) {
    const value = toStringOrNull(candidate[key]);
    if (value) {
      return value;
    }
  }

  const segments = [
    toStringOrNull(candidate.street),
    toStringOrNull(candidate.city),
    toStringOrNull(candidate.state),
    toStringOrNull(candidate.postalCode),
  ].filter(Boolean);

  return segments.length > 0 ? segments.join(", ") : "Unknown address";
};

export const parseRadarSuggestions = (
  payload: unknown
): RadarAddressSuggestion[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as Record<string, unknown>;
  let rawSuggestions: unknown[] = [];
  if (Array.isArray(response.addresses)) {
    rawSuggestions = response.addresses;
  } else if (Array.isArray(response.results)) {
    rawSuggestions = response.results;
  }

  const suggestions: RadarAddressSuggestion[] = [];
  for (const [index, rawSuggestion] of rawSuggestions.entries()) {
    if (!rawSuggestion || typeof rawSuggestion !== "object") {
      continue;
    }

    const candidate = rawSuggestion as Record<string, unknown>;
    suggestions.push({
      id: `${toStringOrNull(candidate.id) ?? "radar"}-${index}`,
      label: getSuggestionLabel(candidate),
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

const fetchRadar = async (url: URL) => {
  const publishableKey = getRadarPublishableKey();
  if (!publishableKey) {
    return null;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: publishableKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<unknown>;
};

export const reverseGeocodeAddress = async (
  latitude: number,
  longitude: number
) => {
  const url = new URL(RADAR_REVERSE_GEOCODE_URL);
  url.searchParams.set("coordinates", `${latitude},${longitude}`);

  const payload = await fetchRadar(url);
  return parseRadarSuggestions(payload)[0] ?? null;
};

export const useRadarAddressAutocomplete = (query: string) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RadarAddressSuggestion[]>([]);
  const requestIdRef = useRef(0);

  const isEnabled = useMemo(() => Boolean(getRadarPublishableKey()), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 3) {
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    const url = new URL(RADAR_AUTOCOMPLETE_URL);
    url.searchParams.set("limit", "5");
    url.searchParams.set("query", trimmed);

    const search = async () => {
      setIsLoading(true);

      try {
        const payload = await fetchRadar(url);
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
  }, [debouncedQuery, isEnabled]);

  return {
    isEnabled,
    isLoading: isLoading && isEnabled && debouncedQuery.trim().length >= 3,
    suggestions,
  };
};
