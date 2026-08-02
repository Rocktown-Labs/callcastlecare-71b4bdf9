import { z } from "zod";

import {
  COMBO_SUBSCRIPTION_PRICES,
  LAUNDRY_PLAN_PRICES,
  LAWNCARE_PLAN_PRICES,
  TECHNOLOGY_FEE_CENTS,
  TRAVEL_FEE_CONFIG,
  WINDOW_WASHING_SUBSCRIPTION_PRICES,
} from "./pricing";

export const stripeCatalogIntervalSchema = z.enum([
  "one_time",
  "week",
  "month",
  "year",
]);

export const stripeCatalogItemSchema = z.object({
  active: z.boolean(),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3).default("usd"),
  description: z.string().min(1),
  interval: stripeCatalogIntervalSchema.default("one_time"),
  name: z.string().min(1),
  serviceType: z.enum([
    "combo",
    "fee",
    "laundry",
    "lawncare",
    "window_washing",
  ]),
  slug: z.string().min(1),
});

export const stripeCouponSchema = z
  .object({
    active: z.boolean(),
    amountOffCents: z.number().int().positive().optional().nullable(),
    code: z.string().min(1),
    currency: z.string().min(3).max(3).default("usd"),
    duration: z.enum(["forever", "once", "repeating"]).default("once"),
    durationInMonths: z.number().int().positive().optional().nullable(),
    name: z.string().min(1),
    percentOff: z.number().positive().max(100).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!(value.amountOffCents || value.percentOff)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide amount off or percent off.",
        path: ["percentOff"],
      });
    }
  });

export const stripeCatalogSyncRequestSchema = z.object({
  coupons: z.array(stripeCouponSchema),
  items: z.array(stripeCatalogItemSchema).min(1),
});

export type StripeCatalogInterval = z.infer<typeof stripeCatalogIntervalSchema>;
export type StripeCatalogItemInput = z.infer<typeof stripeCatalogItemSchema>;
export type StripeCouponInput = z.infer<typeof stripeCouponSchema>;
export type StripeCatalogSyncRequest = z.infer<
  typeof stripeCatalogSyncRequestSchema
>;

const productGroupLabels: Record<string, string> = {
  "bi-weekly-royal-duo": "Bi-Weekly Royal Duo",
  "crown-estate-trio": "Crown Estate Trio",
  "crown-estate-trio-deluxe": "Crown Estate Trio Deluxe",
  "groundskeeper-bi-weekly": "Groundskeeper Bi-Weekly",
  "groundskeeper-monthly": "Groundskeeper Monthly",
  "groundskeeper-one-time": "Groundskeeper One-Time",
  "monthly-castle-care": "Monthly CastleCare",
  "royal-pane": "Royal Pane",
  "royal-wash": "Royal Wash",
  "travel-fee": "Travel Fee",
};

export const getStripeCatalogProductKey = (
  item: Pick<StripeCatalogItemInput, "slug">
) => {
  const { slug } = item;

  for (const prefix of [
    "crown-estate-trio-deluxe",
    "crown-estate-trio",
    "bi-weekly-royal-duo",
    "monthly-castle-care",
    "groundskeeper-bi-weekly",
    "groundskeeper-monthly",
    "groundskeeper-one-time",
    "royal-pane",
    "royal-wash",
    "travel-fee",
  ]) {
    if (slug === prefix || slug.startsWith(`${prefix}-`)) {
      return prefix;
    }
  }

  return slug;
};

export const getStripeCatalogProductName = (
  item: Pick<StripeCatalogItemInput, "name" | "slug">
) => productGroupLabels[getStripeCatalogProductKey(item)] ?? item.name;

export const defaultStripeCatalogItems = [
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-one-time"],
    currency: "usd",
    description:
      "One-time mow, edge, trim, and cleanup for lots under 0.55 acres.",
    interval: "one_time",
    name: "Groundskeeper Small Lot",
    serviceType: "lawncare",
    slug: "groundskeeper-one-time",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-one-time-medium"],
    currency: "usd",
    description:
      "One-time mow, edge, trim, and cleanup for 0.55 to under 1 acre.",
    interval: "one_time",
    name: "Groundskeeper Medium Lot",
    serviceType: "lawncare",
    slug: "groundskeeper-one-time-medium",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-one-time-large"],
    currency: "usd",
    description: "One-time lawn care for 1 to 2 acre properties.",
    interval: "one_time",
    name: "Groundskeeper Large Lot",
    serviceType: "lawncare",
    slug: "groundskeeper-one-time-large",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-custom-quote-deposit"],
    currency: "usd",
    description:
      "Deposit for properties over 2 acres or custom commercial lawn quotes.",
    interval: "one_time",
    name: "Groundskeeper Custom Quote Deposit",
    serviceType: "lawncare",
    slug: "groundskeeper-custom-quote-deposit",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-monthly"],
    currency: "usd",
    description:
      "Monthly mowing, edging, trimming, and cleanup for small lots.",
    interval: "month",
    name: "Groundskeeper Monthly Small",
    serviceType: "lawncare",
    slug: "groundskeeper-monthly",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-monthly-medium"],
    currency: "usd",
    description:
      "Monthly mowing, edging, trimming, and cleanup for medium lots.",
    interval: "month",
    name: "Groundskeeper Monthly Medium",
    serviceType: "lawncare",
    slug: "groundskeeper-monthly-medium",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-monthly-large"],
    currency: "usd",
    description:
      "Monthly mowing, edging, trimming, and cleanup for large lots.",
    interval: "month",
    name: "Groundskeeper Monthly Large",
    serviceType: "lawncare",
    slug: "groundskeeper-monthly-large",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-bi-weekly"],
    currency: "usd",
    description:
      "Bi-weekly mowing, edging, trimming, and cleanup for small lots.",
    interval: "month",
    name: "Groundskeeper Bi-Weekly Small",
    serviceType: "lawncare",
    slug: "groundskeeper-bi-weekly",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-bi-weekly-medium"],
    currency: "usd",
    description:
      "Bi-weekly mowing, edging, trimming, and cleanup for medium lots.",
    interval: "month",
    name: "Groundskeeper Bi-Weekly Medium",
    serviceType: "lawncare",
    slug: "groundskeeper-bi-weekly-medium",
  },
  {
    active: true,
    amountCents: LAWNCARE_PLAN_PRICES["groundskeeper-bi-weekly-large"],
    currency: "usd",
    description:
      "Bi-weekly mowing, edging, trimming, and cleanup for large lots.",
    interval: "month",
    name: "Groundskeeper Bi-Weekly Large",
    serviceType: "lawncare",
    slug: "groundskeeper-bi-weekly-large",
  },
  {
    active: true,
    amountCents: LAUNDRY_PLAN_PRICES["royal-wash-basic"],
    currency: "usd",
    description: "Same-day wash and fold pickup without bedding.",
    interval: "one_time",
    name: "Royal Wash",
    serviceType: "laundry",
    slug: "royal-wash-basic",
  },
  {
    active: true,
    amountCents: LAUNDRY_PLAN_PRICES["royal-wash-deluxe"],
    currency: "usd",
    description: "Same-day wash and fold pickup with bedding included.",
    interval: "one_time",
    name: "Royal Wash + Bedding",
    serviceType: "laundry",
    slug: "royal-wash-bedding",
  },
  {
    active: true,
    amountCents: LAUNDRY_PLAN_PRICES["royal-wash-supreme"],
    currency: "usd",
    description: "Weekly pickup and delivery with bedding included.",
    interval: "month",
    name: "Royal Wash Supreme",
    serviceType: "laundry",
    slug: "royal-wash-supreme",
  },
  {
    active: true,
    amountCents: 10_000,
    currency: "usd",
    description:
      "Exterior pane washing minimum job for residential properties.",
    interval: "one_time",
    name: "Royal Pane Shine",
    serviceType: "window_washing",
    slug: "royal-pane-exterior",
  },
  {
    active: true,
    amountCents: 20_000,
    currency: "usd",
    description:
      "Inside and outside residential glass care using the 20-pane launch estimate.",
    interval: "one_time",
    name: "Royal Pane Detail",
    serviceType: "window_washing",
    slug: "royal-pane-detail",
  },
  {
    active: true,
    amountCents: WINDOW_WASHING_SUBSCRIPTION_PRICES["royal-pane-monthly"],
    currency: "usd",
    description:
      "Monthly exterior window washing using the standard 20-pane minimum.",
    interval: "month",
    name: "Royal Pane Monthly",
    serviceType: "window_washing",
    slug: "royal-pane-monthly",
  },
  {
    active: true,
    amountCents: WINDOW_WASHING_SUBSCRIPTION_PRICES["royal-pane-bi-annual"],
    currency: "usd",
    description: "Two inside-and-out window washing visits per year.",
    interval: "year",
    name: "Royal Pane Bi-Annual Detail",
    serviceType: "window_washing",
    slug: "royal-pane-bi-annual",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["bi-weekly-royal-duo-small"],
    currency: "usd",
    description: "2 small-lot lawn care visits plus 2 wash and fold pickups.",
    interval: "month",
    name: "Bi-Weekly Royal Duo Small",
    serviceType: "combo",
    slug: "bi-weekly-royal-duo-small",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["bi-weekly-royal-duo-medium"],
    currency: "usd",
    description: "2 medium-lot lawn care visits plus 2 wash and fold pickups.",
    interval: "month",
    name: "Bi-Weekly Royal Duo Medium",
    serviceType: "combo",
    slug: "bi-weekly-royal-duo-medium",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["bi-weekly-royal-duo-large"],
    currency: "usd",
    description: "2 large-lot lawn care visits plus 2 wash and fold pickups.",
    interval: "month",
    name: "Bi-Weekly Royal Duo Large",
    serviceType: "combo",
    slug: "bi-weekly-royal-duo-large",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["monthly-castle-care-small"],
    currency: "usd",
    description: "1 small-lot lawn care visit plus 1 exterior window cleaning.",
    interval: "month",
    name: "Monthly CastleCare Small",
    serviceType: "combo",
    slug: "monthly-castle-care-small",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["monthly-castle-care-medium"],
    currency: "usd",
    description:
      "1 medium-lot lawn care visit plus 1 exterior window cleaning.",
    interval: "month",
    name: "Monthly CastleCare Medium",
    serviceType: "combo",
    slug: "monthly-castle-care-medium",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["monthly-castle-care-large"],
    currency: "usd",
    description: "1 large-lot lawn care visit plus 1 exterior window cleaning.",
    interval: "month",
    name: "Monthly CastleCare Large",
    serviceType: "combo",
    slug: "monthly-castle-care-large",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["royal-linen-panes-duo"],
    currency: "usd",
    description:
      "4 wash and fold pickups plus 1 exterior window cleaning each month.",
    interval: "month",
    name: "Royal Linen & Panes Duo",
    serviceType: "combo",
    slug: "royal-linen-panes-duo",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["crown-estate-trio-small"],
    currency: "usd",
    description:
      "Bi-weekly mow, bi-weekly wash and fold, and 1 monthly exterior window cleaning for small lots.",
    interval: "month",
    name: "Crown Estate Trio Small",
    serviceType: "combo",
    slug: "crown-estate-trio-small",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["crown-estate-trio-medium"],
    currency: "usd",
    description:
      "Bi-weekly mow, bi-weekly wash and fold, and 1 monthly exterior window cleaning for medium lots.",
    interval: "month",
    name: "Crown Estate Trio Medium",
    serviceType: "combo",
    slug: "crown-estate-trio-medium",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["crown-estate-trio-large"],
    currency: "usd",
    description:
      "Bi-weekly mow, bi-weekly wash and fold, and 1 monthly exterior window cleaning for large lots.",
    interval: "month",
    name: "Crown Estate Trio Large",
    serviceType: "combo",
    slug: "crown-estate-trio-large",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["crown-estate-trio-deluxe-small"],
    currency: "usd",
    description:
      "Crown Estate Trio plus inside-and-out windows and bedding on laundry visits for small lots.",
    interval: "month",
    name: "Crown Estate Trio Deluxe Small",
    serviceType: "combo",
    slug: "crown-estate-trio-deluxe-small",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["crown-estate-trio-deluxe-medium"],
    currency: "usd",
    description:
      "Crown Estate Trio plus inside-and-out windows and bedding on laundry visits for medium lots.",
    interval: "month",
    name: "Crown Estate Trio Deluxe Medium",
    serviceType: "combo",
    slug: "crown-estate-trio-deluxe-medium",
  },
  {
    active: true,
    amountCents: COMBO_SUBSCRIPTION_PRICES["crown-estate-trio-deluxe-large"],
    currency: "usd",
    description:
      "Crown Estate Trio plus inside-and-out windows and bedding on laundry visits for large lots.",
    interval: "month",
    name: "Crown Estate Trio Deluxe Large",
    serviceType: "combo",
    slug: "crown-estate-trio-deluxe-large",
  },
  {
    active: true,
    amountCents: TRAVEL_FEE_CONFIG.flatInStateCents,
    currency: "usd",
    description: `Flat travel fee for Arkansas jobs beyond ${TRAVEL_FEE_CONFIG.includedMiles} miles from HQ.`,
    interval: "one_time",
    name: "Travel Fee - In State",
    serviceType: "fee",
    slug: "travel-fee-in-state",
  },
  {
    active: true,
    amountCents: TRAVEL_FEE_CONFIG.flatOutOfStateCents,
    currency: "usd",
    description: "Flat travel fee for out-of-state jobs.",
    interval: "one_time",
    name: "Travel Fee - Out of State",
    serviceType: "fee",
    slug: "travel-fee-out-of-state",
  },
  {
    active: true,
    amountCents: TECHNOLOGY_FEE_CENTS,
    currency: "usd",
    description: "Standard technology and dispatch fee per order.",
    interval: "one_time",
    name: "Technology Fee",
    serviceType: "fee",
    slug: "technology-fee",
  },
  {
    active: true,
    amountCents: TRAVEL_FEE_CONFIG.flatOutOfStateCents,
    currency: "usd",
    description: `Flat travel fee for out-of-state jobs beyond ${TRAVEL_FEE_CONFIG.includedMiles} miles from HQ.`,
    interval: "one_time",
    name: "Travel Fee - Out Of State",
    serviceType: "fee",
    slug: "travel-fee-out-of-state",
  },
] as const satisfies StripeCatalogItemInput[];

export const defaultStripeCoupons = [
  {
    active: true,
    amountOffCents: null,
    code: "ROYAL20",
    currency: "usd",
    duration: "once",
    durationInMonths: null,
    name: "Royal Combo Launch",
    percentOff: 20,
  },
  {
    active: true,
    amountOffCents: null,
    code: "ESTATE30",
    currency: "usd",
    duration: "once",
    durationInMonths: null,
    name: "Crown Estate Trio",
    percentOff: 30,
  },
] as const satisfies StripeCouponInput[];
