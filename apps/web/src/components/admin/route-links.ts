export interface RouteStopAddress {
  city?: string | null;
  formattedAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  state?: string | null;
  street?: string | null;
  zip?: string | null;
}

const getAddressQuery = (address?: RouteStopAddress | null) => {
  if (!address) {
    return null;
  }
  if (
    typeof address.latitude === "number" &&
    typeof address.longitude === "number"
  ) {
    return `${address.latitude},${address.longitude}`;
  }
  if (address.formattedAddress) {
    return address.formattedAddress;
  }
  const composed = [address.street, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");
  return composed || null;
};

export const getGoogleSearchUrl = (address?: RouteStopAddress | null) => {
  const query = getAddressQuery(address);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
};

/**
 * Universal links that open in the worker's own mapping software (Google or
 * Apple Maps apps, mobile browsers included). Waypoints cap at 9 total
 * destinations for the Google universal URL.
 */
export const getGoogleDirectionsUrl = (
  stops: { address?: RouteStopAddress | null }[]
) => {
  const points = stops
    .map((stop) => getAddressQuery(stop.address))
    .filter((point): point is string => Boolean(point));
  if (points.length === 0) {
    return null;
  }
  const [origin, ...rest] = points;
  const destination = rest.pop() ?? origin;
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });
  params.set("origin", origin ?? destination);
  if (rest.length > 0) {
    params.set("waypoints", rest.slice(0, 8).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const getAppleDirectionsUrl = (address?: RouteStopAddress | null) => {
  const query = getAddressQuery(address);
  return query
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(query)}`
    : null;
};

const EARTH_MILES = 3958.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const haversineMiles = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(a));
};

export const getStopCoordinates = (address?: RouteStopAddress | null) =>
  typeof address?.latitude === "number" &&
  typeof address?.longitude === "number"
    ? { latitude: address.latitude, longitude: address.longitude }
    : null;

/** Straight-line miles between consecutive stops with coordinates. */
export const getRouteLegMiles = (
  stops: { address?: RouteStopAddress | null }[]
): (number | null)[] =>
  stops.map((stop, index) => {
    if (index === 0) {
      return null;
    }
    const from = getStopCoordinates(stops[index - 1]?.address);
    const to = getStopCoordinates(stop.address);
    if (!from || !to) {
      return null;
    }
    return haversineMiles(from, to);
  });

export const formatMiles = (miles: number) =>
  miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
