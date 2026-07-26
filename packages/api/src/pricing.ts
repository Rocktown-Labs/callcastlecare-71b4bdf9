export const HOME_PREORDER_DEPOSIT_CENTS = 5000;

export const LAWNCARE_PLAN_PRICES = {
  "groundskeeper-bi-weekly": 12_500,
  "groundskeeper-bi-weekly-medium": 20_000,
  "groundskeeper-commercial": 25_000,
  "groundskeeper-commercial-bi-weekly": 45_000,
  "groundskeeper-one-time": 7500,
  "groundskeeper-one-time-medium": 12_000,
} as const;

export const LAUNDRY_PLAN_PRICES = {
  "royal-wash-basic": 4000,
  "royal-wash-deluxe": 6000,
  "royal-wash-supreme": 25_000,
} as const;

export const LAWNCARE_SERVICE_HOURS = {
  endHourLocal: 20,
  startHourLocal: 6,
} as const;

export type LawncarePlanId = keyof typeof LAWNCARE_PLAN_PRICES;
export type LaundryPlanId = keyof typeof LAUNDRY_PLAN_PRICES;
