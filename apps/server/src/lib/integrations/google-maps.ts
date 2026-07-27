import { env } from "@callcastlecare/env/server";

export interface GoogleAddressSuggestion {
  formattedAddress: string;
  placeId: string;
}

export interface GoogleValidatedAddress {
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
  };
  zip: string;
}

const solutionId = "gmp_git_agentskills_v1";

const getMapsApiKey = () => env.GOOGLE_MAPS_API_KEY;

const toStringOrNull = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const toNumberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const findAddressComponent = (
  components: Record<string, unknown>[],
  type: string
) => {
  for (const component of components) {
    const componentType = toStringOrNull(component.componentType);
    if (componentType === type) {
      return toStringOrNull(component.componentName);
    }
  }

  return null;
};

const fallbackValidatedAddress = (address: string): GoogleValidatedAddress => ({
  city: "Unknown",
  country: "US",
  formattedAddress: address,
  latitude: null,
  longitude: null,
  placeId: null,
  raw: {
    fallback: true,
    source: "google_maps_unavailable",
  },
  state: "AR",
  street: address,
  verdict: {
    hasUnconfirmedComponents: true,
    isComplete: false,
  },
  zip: "00000",
});

export const autocompleteGoogleAddresses = async (
  input: string
): Promise<GoogleAddressSuggestion[]> => {
  const apiKey = getMapsApiKey();
  const trimmed = input.trim();
  if (!apiKey || trimmed.length < 3) {
    return [];
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      body: JSON.stringify({
        includedRegionCodes: ["us"],
        input: trimmed,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
        "X-Goog-Maps-Solution-ID": solutionId,
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        text?: {
          text?: string;
        };
      };
    }[];
  };

  return (payload.suggestions ?? [])
    .map((suggestion) => {
      const prediction = suggestion.placePrediction;
      const placeId = prediction?.placeId;
      const formattedAddress = prediction?.text?.text;
      if (!placeId || !formattedAddress) {
        return null;
      }

      return {
        formattedAddress,
        placeId,
      };
    })
    .filter((suggestion): suggestion is GoogleAddressSuggestion =>
      Boolean(suggestion)
    );
};

export const validateGoogleAddress = async (
  address: string
): Promise<GoogleValidatedAddress> => {
  const apiKey = getMapsApiKey();
  const trimmed = address.trim();
  if (!apiKey || trimmed.length < 5) {
    return fallbackValidatedAddress(address);
  }

  const response = await fetch(
    `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
    {
      body: JSON.stringify({
        address: {
          addressLines: [trimmed],
          regionCode: "US",
        },
        enableUspsCass: true,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Maps-Solution-ID": solutionId,
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    return fallbackValidatedAddress(address);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const result = (payload.result ?? {}) as Record<string, unknown>;
  const addressResult = (result.address ?? {}) as Record<string, unknown>;
  const geocode = (result.geocode ?? {}) as Record<string, unknown>;
  const location = (geocode.location ?? {}) as Record<string, unknown>;
  const verdict = (result.verdict ?? {}) as Record<string, unknown>;
  const components = Array.isArray(addressResult.addressComponents)
    ? (addressResult.addressComponents as Record<string, unknown>[])
    : [];
  const formattedAddress =
    toStringOrNull(addressResult.formattedAddress) ?? trimmed;

  return {
    city: findAddressComponent(components, "locality") ?? "Unknown",
    country: findAddressComponent(components, "country") ?? "US",
    formattedAddress,
    latitude: toNumberOrNull(location.latitude),
    longitude: toNumberOrNull(location.longitude),
    placeId: toStringOrNull(geocode.placeId),
    raw: payload,
    state:
      findAddressComponent(components, "administrative_area_level_1") ?? "AR",
    street:
      [
        findAddressComponent(components, "street_number"),
        findAddressComponent(components, "route"),
      ]
        .filter(Boolean)
        .join(" ") || formattedAddress,
    verdict: {
      hasUnconfirmedComponents:
        Boolean(verdict.hasUnconfirmedComponents) ||
        Boolean(verdict.hasInferredComponents),
      isComplete: Boolean(verdict.addressComplete),
    },
    zip: findAddressComponent(components, "postal_code") ?? "00000",
  };
};
