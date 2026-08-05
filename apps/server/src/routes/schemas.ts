import {
  optionalPhoneSchema,
  phoneSchema,
} from "@callcastlecare/api/validation";
import { z } from "zod";

export const timingTypeSchema = z.enum(["asap", "scheduled"]);

export const updateCheckoutSettingsRequestSchema = z.object({
  allowCashCheckout: z.boolean(),
});

export const checkoutPreviewItemSchema = z
  .object({
    cleanScreens: z.boolean().optional(),
    frequency: z
      .enum(["one_time", "bi_weekly", "weekly", "monthly"])
      .optional(),
    homeQuoteId: z.number().int().positive().optional(),
    isSubscription: z.boolean().optional(),
    itemKind: z.enum([
      "lawncare",
      "laundry",
      "window_washing",
      "home_preorder",
    ]),
    livingArea: z.number().int().positive().optional(),
    packageType: z.enum(["EXTERIOR_ONLY", "FULL_SERVICE"]).optional(),
    paneCount: z.number().int().positive().optional(),
    planId: z.string().min(1).optional(),
    propertyType: z.enum(["residential", "commercial"]).optional(),
    scheduledEndAt: z.string().datetime().optional(),
    scheduledStartAt: z.string().datetime().optional(),
    stories: z.number().int().min(1).max(3).optional(),
    timingType: timingTypeSchema.optional(),
    tipAmountCents: z.number().int().nonnegative().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.timingType !== "scheduled") {
      return;
    }

    if (!value.scheduledStartAt || !value.scheduledEndAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled services require start and end times.",
        path: ["scheduledStartAt"],
      });
      return;
    }

    const start = new Date(value.scheduledStartAt);
    const end = new Date(value.scheduledEndAt);
    if (start.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled services must start in the future.",
        path: ["scheduledStartAt"],
      });
    }
    const durationMs = end.getTime() - start.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (durationMs !== twoHoursMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled services must reserve exactly two hours.",
        path: ["scheduledEndAt"],
      });
    }
  });

export const checkoutPreviewRequestSchema = z
  .object({
    address: z.string().min(5).optional(),
    addressId: z.number().int().positive().optional(),
    items: z.array(checkoutPreviewItemSchema).min(1),
    tipAmountCents: z.number().int().nonnegative().optional(),
    travelDistanceMiles: z.number().nonnegative().optional(),
    travelFeeCents: z.number().int().nonnegative().optional(),
    travelStateCode: z.string().trim().length(2).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.address && !value.addressId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either address or addressId is required",
        path: ["address"],
      });
    }
  });

export const checkoutConfirmRequestSchema = checkoutPreviewRequestSchema.extend(
  {
    contact: z.object({
      email: z.email(),
      name: z.string().trim().min(2),
      phone: phoneSchema,
    }),
    paymentMethodId: z.string().min(1).optional(),
    paymentOption: z.enum(["deposit_invoice", "pay_full", "deposit_cash"]),
  }
);

export const checkoutDraftRequestSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});

export const quoteRequestStatusSchema = z.enum([
  "draft",
  "contact_captured",
  "checkout_started",
  "paid",
  "abandoned",
  "cancelled",
]);

export const publicQuoteRequestSchema = z.object({
  address: z.string().trim().min(5).optional(),
  contact: z
    .object({
      email: z.email().optional().or(z.literal("")),
      name: z.string().trim().optional(),
      phone: optionalPhoneSchema,
    })
    .optional(),
  lastCompletedStep: z.number().int().min(0).max(6).default(0),
  payload: z.record(z.string(), z.unknown()),
  status: quoteRequestStatusSchema.default("draft"),
  trackingId: z.string().trim().min(8).max(128),
});

export const updateCustomerProfileRequestSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: optionalPhoneSchema.nullable(),
});

export const upsertAddressRequestSchema = z
  .object({
    address: z.string().trim().min(5).optional(),
    city: z.string().trim().min(1).optional(),
    country: z.string().trim().min(2).optional(),
    formattedAddress: z.string().trim().min(5).optional(),
    instructions: z.string().trim().max(500).optional().nullable(),
    isDefault: z.boolean().optional(),
    label: z.string().trim().min(1).max(64).optional(),
    latitude: z.number().finite().optional().nullable(),
    longitude: z.number().finite().optional().nullable(),
    state: z.string().trim().min(2).optional(),
    street: z.string().trim().min(1).optional(),
    zip: z.string().trim().min(3).optional(),
  })
  .superRefine((value, ctx) => {
    const hasStructuredAddress = !!(
      value.street &&
      value.city &&
      value.state &&
      value.zip
    );

    if (!value.address && !hasStructuredAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide address text or full structured address",
        path: ["address"],
      });
    }
  });

export const updateAddressRequestSchema = z.object({
  instructions: z.string().trim().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
  label: z.string().trim().min(1).max(64).optional(),
});

export const supportRequestSchema = z.object({
  addressText: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.email(),
  message: z.string().trim().min(10).max(2000),
  name: z.string().trim().min(2).max(120),
  orderId: z.number().int().positive().optional().nullable(),
  orderNumber: z.string().trim().max(80).optional().or(z.literal("")),
  phone: optionalPhoneSchema,
  requestType: z
    .enum(["help", "dashboard_help", "service_area"])
    .default("help"),
  serviceType: z
    .enum(["lawncare", "laundry", "window_washing", "combo", "unknown"])
    .default("unknown"),
  sourcePath: z.string().trim().max(160).optional().or(z.literal("")),
  state: z.string().trim().max(40).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
});

export const driverLocationHeartbeatSchema = z.object({
  accuracyMeters: z.number().finite().optional().nullable(),
  capturedAt: z.string().datetime().optional(),
  heading: z.number().finite().optional().nullable(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  orderId: z.number().int().positive().optional(),
  speedMps: z.number().finite().optional().nullable(),
});

export const providerProfileRequestSchema = z.object({
  applicationFormData: z.record(z.string(), z.unknown()).optional(),
  email: z.email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: phoneSchema,
  serviceRadiusMiles: z.number().int().positive().max(100).default(20),
  servicesOffered: z
    .array(z.enum(["lawncare", "laundry", "window-washing"]))
    .min(1),
});

export const homeQuoteRequestSchema = z.object({
  address: z.string().min(5),
});

export const mediaUploadUrlRequestSchema = z.object({
  contentType: z.string().min(1),
  legId: z.number().int().positive().optional(),
  mediaType: z.enum([
    "service_before",
    "service_after",
    "lawncare_before",
    "lawncare_after",
    "laundry_pickup",
    "laundry_scan",
    "laundry_folded",
    "laundry_dropoff",
  ]),
  orderId: z.number().int().positive().optional(),
});

export const mediaAttachRequestSchema = z.object({
  legId: z.number().int().positive().optional(),
  mediaType: z.enum([
    "service_before",
    "service_after",
    "lawncare_before",
    "lawncare_after",
    "laundry_pickup",
    "laundry_scan",
    "laundry_folded",
    "laundry_dropoff",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  orderId: z.number().int().positive().optional(),
  requiredForTransition: z.string().optional(),
  storagePath: z.string().min(1),
});

export const adminOrderActionRequestSchema = z.object({
  action: z.enum(["confirm", "arrived", "start", "complete", "cancel", "fail"]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const adminOrderNoteRequestSchema = z.object({
  note: z.string().trim().min(1).max(1000),
});
