export const SERVICE_HQ = {
  address: "13 Cloverdale Blvd, Searcy, AR 72143",
  latitude: 35.247964,
  longitude: -91.704566,
  stateCode: "AR",
} as const;

export const TRAVEL_FEE_CONFIG = {
  averageSpeedMph: 50,
  flatInStateCents: 5000,
  flatOutOfStateCents: 10_000,
  includedMiles: 60,
  originLabel: SERVICE_HQ.address,
  roadDistanceFactor: 1.3,
} as const;

export type TravelFeeKind = "free" | "in_state" | "out_of_state";

export interface TravelEstimate {
  distanceMiles: number;
  driveMinutes: number;
  feeCents: number;
  feeKind: TravelFeeKind;
  inState: boolean;
  isLocal: boolean;
  origin: typeof SERVICE_HQ;
  prefersSubscription: boolean;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const milesBetweenCoordinates = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const earthRadiusMiles = 3958.8;
  const deltaLatitude = toRadians(second.latitude - first.latitude);
  const deltaLongitude = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const estimateRoadDistanceMiles = (
  destination: { latitude: number; longitude: number },
  origin: { latitude: number; longitude: number } = SERVICE_HQ
) =>
  Math.round(
    milesBetweenCoordinates(origin, destination) *
      TRAVEL_FEE_CONFIG.roadDistanceFactor
  );

export const estimateDriveMinutes = (distanceMiles: number) => {
  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) {
    return 0;
  }

  return Math.ceil((distanceMiles / TRAVEL_FEE_CONFIG.averageSpeedMph) * 60);
};

export const normalizeStateCode = (state?: string | null) => {
  if (!state) {
    return null;
  }

  const trimmed = state.trim().toUpperCase();
  if (trimmed.length === 2) {
    return trimmed;
  }

  const aliases: Record<string, string> = {
    ARKANSAS: "AR",
    TEXAS: "TX",
  };

  return aliases[trimmed] ?? trimmed.slice(0, 2);
};

export const calculateTravelFeeCents = ({
  distanceMiles,
  stateCode,
}: {
  distanceMiles?: number | null;
  stateCode?: string | null;
}): { feeCents: number; feeKind: TravelFeeKind; inState: boolean } => {
  const normalizedState = normalizeStateCode(stateCode);
  const inState = normalizedState === SERVICE_HQ.stateCode;
  const miles =
    typeof distanceMiles === "number" && Number.isFinite(distanceMiles)
      ? distanceMiles
      : 0;

  if (miles <= TRAVEL_FEE_CONFIG.includedMiles) {
    return { feeCents: 0, feeKind: "free", inState };
  }

  if (!inState) {
    return {
      feeCents: TRAVEL_FEE_CONFIG.flatOutOfStateCents,
      feeKind: "out_of_state",
      inState: false,
    };
  }

  return {
    feeCents: TRAVEL_FEE_CONFIG.flatInStateCents,
    feeKind: "in_state",
    inState: true,
  };
};

export const buildTravelEstimate = ({
  latitude,
  longitude,
  stateCode,
}: {
  latitude: number;
  longitude: number;
  stateCode?: string | null;
}): TravelEstimate => {
  const distanceMiles = estimateRoadDistanceMiles({ latitude, longitude });
  const driveMinutes = estimateDriveMinutes(distanceMiles);
  const fee = calculateTravelFeeCents({ distanceMiles, stateCode });
  const isLocal = distanceMiles <= TRAVEL_FEE_CONFIG.includedMiles;

  return {
    distanceMiles,
    driveMinutes,
    feeCents: fee.feeCents,
    feeKind: fee.feeKind,
    inState: fee.inState,
    isLocal,
    origin: SERVICE_HQ,
    prefersSubscription: !fee.inState,
  };
};

export const TIP_PERCENT_OPTIONS = [0, 5, 10, 15, 20] as const;
export type TipPercentOption = (typeof TIP_PERCENT_OPTIONS)[number];

export const calculateTipAmountCents = ({
  customPercent,
  percent,
  subtotalCents,
}: {
  customPercent?: number | null;
  percent: TipPercentOption | "custom";
  subtotalCents: number;
}) => {
  const base = Math.max(0, subtotalCents);
  if (percent === "custom") {
    const value =
      typeof customPercent === "number" && Number.isFinite(customPercent)
        ? customPercent
        : 0;
    return Math.round((base * Math.max(0, value)) / 100);
  }

  return Math.round((base * percent) / 100);
};
