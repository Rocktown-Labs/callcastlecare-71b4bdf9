import { z } from "zod";

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
  serviceType: z.enum(["lawncare", "laundry", "window_washing", "combo"]),
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

export const defaultStripeCatalogItems = [
  {
    active: true,
    amountCents: 7500,
    currency: "usd",
    description: "One-time mow, edge, trim, and cleanup for standard lots.",
    interval: "one_time",
    name: "Groundskeeper One-Time",
    serviceType: "lawncare",
    slug: "groundskeeper-one-time",
  },
  {
    active: true,
    amountCents: 12_000,
    currency: "usd",
    description: "One-time mowing and reset service for medium lots.",
    interval: "one_time",
    name: "Groundskeeper Medium Lot",
    serviceType: "lawncare",
    slug: "groundskeeper-one-time-medium",
  },
  {
    active: true,
    amountCents: 12_500,
    currency: "usd",
    description: "Bi-weekly mowing, edging, trimming, and cleanup.",
    interval: "month",
    name: "Groundskeeper Bi-Weekly",
    serviceType: "lawncare",
    slug: "groundskeeper-bi-weekly",
  },
  {
    active: true,
    amountCents: 4000,
    currency: "usd",
    description: "Same-day wash and fold pickup without bedding.",
    interval: "one_time",
    name: "Royal Wash",
    serviceType: "laundry",
    slug: "royal-wash-basic",
  },
  {
    active: true,
    amountCents: 6000,
    currency: "usd",
    description: "Same-day wash and fold pickup with bedding included.",
    interval: "one_time",
    name: "Royal Wash + Bedding",
    serviceType: "laundry",
    slug: "royal-wash-bedding",
  },
  {
    active: true,
    amountCents: 10_000,
    currency: "usd",
    description: "Exterior pane washing minimum job.",
    interval: "one_time",
    name: "Royal Pane Exterior",
    serviceType: "window_washing",
    slug: "royal-pane-exterior",
  },
  {
    active: true,
    amountCents: 18_000,
    currency: "usd",
    description: "Inside and outside glass care with detail finish.",
    interval: "one_time",
    name: "Royal Pane Detail",
    serviceType: "window_washing",
    slug: "royal-pane-detail",
  },
  {
    active: true,
    amountCents: 50_000,
    currency: "usd",
    description: "Bi-weekly lawn care plus bi-weekly Royal Wash laundry.",
    interval: "month",
    name: "Bi-Weekly Royal Duo",
    serviceType: "combo",
    slug: "bi-weekly-royal-duo",
  },
  {
    active: true,
    amountCents: 65_000,
    currency: "usd",
    description: "Monthly lawn care and Royal Pane window detail.",
    interval: "month",
    name: "Monthly Castle Care",
    serviceType: "combo",
    slug: "monthly-castle-care",
  },
  {
    active: true,
    amountCents: 95_000,
    currency: "usd",
    description: "Lawn care, laundry, and Royal Pane detail in one plan.",
    interval: "month",
    name: "Crown Estate Trio",
    serviceType: "combo",
    slug: "crown-estate-trio",
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
